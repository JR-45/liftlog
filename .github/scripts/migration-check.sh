#!/usr/bin/env bash
# Prüft, ob ein Pull Request neue Migrationen enthält. Neue Migrationen müssen vom Projekt-Owner
# online eingespielt werden, bevor gemergt wird, sonst bricht die Live-App. Bestätigt wird das
# mit dem Label „migration-online“ am Pull Request.
#
# Erwartet: BASE_SHA, HEAD_SHA, LABEL_SET ("true"/"false"). Schreibt in GITHUB_STEP_SUMMARY, falls gesetzt.
set -euo pipefail

summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
dir="supabase/migrations"

new_files=$(git diff --name-only --diff-filter=A "$BASE_SHA...$HEAD_SHA" -- "$dir/*.sql" | sort)
if [ -z "$new_files" ]; then
  echo "Keine neue Migration im Pull Request."
  exit 0
fi

# Neueste Migration, die schon auf dem Ziel-Branch liegt. Ältere neue Dateien brauchen --include-all.
latest_base=$(git ls-tree --name-only "$BASE_SHA" "$dir/" | grep '\.sql$' | xargs -n1 basename | sort | tail -n1)
needs_include_all=false
for file in $new_files; do
  if [[ "$(basename "$file")" < "$latest_base" ]]; then needs_include_all=true; fi
done

command="bunx supabase db push --remote"
if [ "$needs_include_all" = true ]; then command="$command --include-all"; fi

{
  echo "## Neue Migration im Pull Request"
  echo
  for file in $new_files; do echo "- \`$file\`"; done
  echo
  echo "Vor dem Merge online einspielen (nur der Projekt-Owner):"
  echo
  echo '```bash'
  echo "git switch <dieser-branch> && $command"
  echo '```'
  if [ "$needs_include_all" = true ]; then
    echo
    echo "Mindestens eine Migration ist älter datiert als die neueste auf \`main\`, deshalb \`--include-all\`."
  fi
  echo
  echo "Danach am Pull Request das Label \`migration-online\` setzen. Dann wird dieser Check grün."
} >> "$summary"

echo "Neue Migrationen:"
echo "$new_files"
echo "Befehl: $command"

if [ "$LABEL_SET" = "true" ]; then
  echo "Label migration-online ist gesetzt: Migration ist laut Owner online eingespielt."
  exit 0
fi

echo "::error title=Migration nicht bestätigt::Dieser Pull Request enthält eine neue Migration. Erst online einspielen ($command), dann das Label migration-online setzen."
exit 1
