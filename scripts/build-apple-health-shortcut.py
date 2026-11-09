#!/usr/bin/env python3
"""Erzeugt den iOS-Kurzbefehl „LiftLog Apple Watch“ und signiert ihn auf einem Mac.

Der Kurzbefehl liest die heutigen Apple-Health-Werte (aktive Kalorien, Trainingsminuten)
und schickt sie mit dem persönlichen Import-Schlüssel an public.import_apple_health().

Der Schlüssel steht nicht in der Datei. Beim ersten Ausführen fragt der Kurzbefehl einmal danach und
speichert ihn als LiftLog-Schluessel.txt im Kurzbefehle-Ordner in iCloud Drive. Lehnt der Server ihn
ab (z. B. nach „Neu einrichten“ in der App), löscht der Kurzbefehl die Datei und fragt beim nächsten
Mal neu. Import-Fragen (WFWorkflowImportQuestions) gehen nicht: Selbst signierte Kurzbefehle mit
Import-Frage werden nach dem Beantworten nicht angelegt (getestet auf macOS 27 und iOS).

Aufbau der Health-Aktionen nach echten iOS-Exporten, siehe
https://github.com/viticci/shortcuts-playground-plugin (HEALTHKIT.md): Typ-Zeile mit Operator 4,
„Startdatum ist heute“ mit Operator 1002 (leere Values), Gruppierung nach Tag, Bezeichnungen wie in der iOS-Auswahl („Active Calories“).

Aufruf (nur macOS, braucht ein mit iCloud angemeldetes Konto zum Signieren):
  python3 scripts/build-apple-health-shortcut.py \\
    --url https://<projekt>.supabase.co --key sb_publishable_... \\
    --out public/LiftLog-Apple-Watch.shortcut
"""

import argparse
import plistlib
import subprocess
import tempfile
import uuid
from pathlib import Path

PLACEHOLDER = "￼"
KEY_FILE = "LiftLog-Schluessel.txt"
KEY_VARIABLE = "LiftLog-Schluessel"


def new_uuid() -> str:
    return str(uuid.uuid4()).upper()


def text(value: str) -> dict:
    return {"Value": {"string": value}, "WFSerializationType": "WFTextTokenString"}


def output_ref(action_uuid: str, name: str) -> dict:
    return {"OutputUUID": action_uuid, "OutputName": name, "Type": "ActionOutput"}


def token(ref: dict) -> dict:
    """Ein Feld, das nur aus einer Variablen besteht."""
    return {
        "Value": {"string": PLACEHOLDER, "attachmentsByRange": {"{0, 1}": ref}},
        "WFSerializationType": "WFTextTokenString",
    }


def variable(name: str) -> dict:
    return {"Type": "Variable", "VariableName": name}


def condition_input(ref: dict) -> dict:
    return {"Type": "Variable", "Variable": attachment(ref)}


def conditional(group: str, mode: int, **extra) -> dict:
    return action("conditional", {"GroupingIdentifier": group, "WFControlFlowMode": mode, **extra})


def get_key_file(action_uuid: str) -> dict:
    return action("documentpicker.open", {
        "UUID": action_uuid,
        "WFGetFilePath": text(KEY_FILE),
        "WFFileErrorIfNotFound": False,
        "WFShowFilePicker": False,
    })


def attachment(ref: dict) -> dict:
    return {"Value": ref, "WFSerializationType": "WFTextTokenAttachment"}


def dictionary(items: list[tuple[str, dict]]) -> dict:
    return {
        "Value": {
            "WFDictionaryFieldValueItems": [
                {"WFItemType": 0, "WFKey": text(key), "WFValue": value} for key, value in items
            ]
        },
        "WFSerializationType": "WFDictionaryFieldValue",
    }


def action(identifier: str, parameters: dict) -> dict:
    return {"WFWorkflowActionIdentifier": f"is.workflow.actions.{identifier}", "WFWorkflowActionParameters": parameters}


def health_today_sum(label: str) -> tuple[list[dict], dict]:
    """Holt die heutige Tagessumme eines Health-Typs. Gibt Aktionen und Ergebnis zurück."""
    find_uuid, sum_uuid = new_uuid(), new_uuid()
    find = action("filter.health.quantity", {
        "UUID": find_uuid,
        "WFContentItemFilter": {
            "Value": {
                "WFActionParameterFilterPrefix": 1,
                "WFContentPredicateBoundedDate": False,
                "WFActionParameterFilterTemplates": [
                    {
                        "Bounded": True, "Operator": 4, "Property": "Type", "Removable": False,
                        "Values": {"Enumeration": {"Value": label, "WFSerializationType": "WFStringSubstitutableState"}},
                    },
                    {
                        "Bounded": True, "Operator": 1002, "Property": "Start Date", "Removable": True,
                        "Values": {},
                    },
                ],
            },
            "WFSerializationType": "WFContentPredicateTableTemplate",
        },
        # Tagessumme statt aller Einzelmessungen: Ohne Gruppierung lädt iOS 18 alle Proben
        # (bei Watch-Trägern zehntausende) und bleibt bei „Health-Proben suchen“ hängen.
        "WFHKSampleFilteringGroupBy": "Day",
        "WFHKSampleFilteringFillMissing": False,
        "WFContentItemSortProperty": "Start Date",
        "WFContentItemSortOrder": "Latest First",
        "WFContentItemLimitEnabled": True,
        "WFContentItemLimitNumber": 1,
    })
    total = action("statistics", {
        "UUID": sum_uuid,
        "WFStatisticsOperation": "Sum",
        "WFInput": attachment(output_ref(find_uuid, "Health Samples")),
    })
    return [find, total], output_ref(sum_uuid, "Statistics")


def key_actions() -> list[dict]:
    """Schlüssel aus iCloud lesen, beim ersten Mal abfragen und speichern. Ergebnis: Variable KEY_VARIABLE."""
    file_uuid, ask_uuid, named_uuid, read_uuid, group = new_uuid(), new_uuid(), new_uuid(), new_uuid(), new_uuid()
    return [
        get_key_file(file_uuid),
        conditional(group, 0, WFCondition=101, WFInput=condition_input(output_ref(file_uuid, "File"))),
        action("ask", {
            "UUID": ask_uuid,
            "WFAskActionPrompt": "LiftLog-Schlüssel einfügen (LiftLog → Profil → Apple Watch)",
            "WFInputType": "Text",
        }),
        action("setitemname", {
            "UUID": named_uuid,
            "WFName": text(KEY_FILE),
            "WFInput": attachment(output_ref(ask_uuid, "Provided Input")),
        }),
        action("documentpicker.save", {
            "WFInput": attachment(output_ref(named_uuid, "Renamed Item")),
            "WFAskWhereToSave": False,
            "WFSaveFileOverwrite": True,
        }),
        action("setvariable", {"WFVariableName": KEY_VARIABLE, "WFInput": attachment(output_ref(ask_uuid, "Provided Input"))}),
        conditional(group, 1),
        action("gettext", {"UUID": read_uuid, "WFTextActionText": token(output_ref(file_uuid, "File"))}),
        action("setvariable", {"WFVariableName": KEY_VARIABLE, "WFInput": attachment(output_ref(read_uuid, "Text"))}),
        conditional(group, 2),
    ]


def notification(body: str) -> dict:
    return action("notification", {
        "WFNotificationActionTitle": "LiftLog",
        "WFNotificationActionBody": body,
        "WFNotificationActionSound": False,
    })


def build(url: str, key: str, with_health: bool = True) -> dict:
    request_uuid, again_uuid, group = new_uuid(), new_uuid(), new_uuid()
    actions: list[dict] = key_actions()

    if with_health:
        kcal_actions, kcal = health_today_sum("Active Calories")
        minute_actions, minutes = health_today_sum("Exercise Minutes")
        # Schritte bewusst nicht: Die Schritt-Abfrage scheitert auf iOS 18 (getestet), Kalorien
        # und Trainingsminuten laufen. p_steps fehlt, der Server speichert dann 0.
        actions += kcal_actions + minute_actions
        values = [("p_active_kcal", token(kcal)), ("p_workout_minutes", token(minutes))]
    else:
        # Nur zum Testen auf dem Mac (dort gibt es kein Apple Health).
        values = [("p_active_kcal", text("123")), ("p_workout_minutes", text("4")), ("p_steps", text("5678"))]

    actions.append(action("downloadurl", {
        "UUID": request_uuid,
        "WFURL": f"{url.rstrip('/')}/rest/v1/rpc/import_apple_health",
        "WFHTTPMethod": "POST",
        "WFHTTPBodyType": "JSON",
        "ShowHeaders": True,
        "WFHTTPHeaders": dictionary([
            ("apikey", text(key)),
            ("Content-Type", text("application/json")),
        ]),
        "WFJSONValues": dictionary([
            ("p_token", token(variable(KEY_VARIABLE))),
            # Kein Datum: Der Server nimmt den heutigen Tag (Europe/Berlin). Datum formatieren lieferte leer.
            *values,
        ]),
    }))

    # Der Server antwortet bei Erfolg leer, bei einem Fehler mit einer Meldung.
    actions += [
        conditional(group, 0, WFCondition=101, WFInput=condition_input(output_ref(request_uuid, "Contents of URL"))),
        notification("Apple-Watch-Werte übertragen."),
        conditional(group, 1),
        get_key_file(again_uuid),
        action("file.delete", {
            "WFInput": attachment(output_ref(again_uuid, "File")),
            "WFDeleteFileConfirmDeletion": False,
        }),
        notification("Übertragung fehlgeschlagen. Beim nächsten Start den Schlüssel neu einfügen."),
        conditional(group, 2),
    ]

    return {
        "WFWorkflowActions": actions,
        "WFWorkflowClientVersion": "2607.0.2",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowName": "LiftLog-Apple-Watch",
        "WFWorkflowIcon": {"WFWorkflowIconGlyphNumber": 59511, "WFWorkflowIconStartColor": 1440408063},
        "WFWorkflowImportQuestions": [],
        "WFWorkflowInputContentItemClasses": [],
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowTypes": [],
        "WFWorkflowHasShortcutInputVariables": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", required=True, help="Supabase-Projekt-URL")
    parser.add_argument("--key", required=True, help="Öffentlicher sb_publishable_-Schlüssel (nie den Secret-Key)")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--unsigned", action="store_true", help="Nur die unsignierte Datei schreiben")
    parser.add_argument("--without-health", action="store_true", help="Feste Testwerte statt Apple Health (Mac-Test)")
    args = parser.parse_args()

    if not args.key.startswith("sb_publishable_"):
        raise SystemExit("Nur den öffentlichen sb_publishable_-Schlüssel verwenden.")

    data = plistlib.dumps(build(args.url, args.key, with_health=not args.without_health), fmt=plistlib.FMT_BINARY)
    if args.unsigned:
        args.out.write_bytes(data)
        return
    with tempfile.TemporaryDirectory() as directory:
        # Die Kurzbefehle-App benennt den Kurzbefehl nach der Datei, darum gleicher Name wie --out.
        unsigned = Path(directory) / args.out.name
        unsigned.write_bytes(data)
        subprocess.run(
            ["shortcuts", "sign", "--mode", "anyone", "--input", str(unsigned), "--output", str(args.out)],
            check=True,
        )


if __name__ == "__main__":
    main()
