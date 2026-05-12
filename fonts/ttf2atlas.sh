#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 <font.ttf> [output_dir]" >&2
  exit 1
fi

font_path="$1"
output_dir="${2:-.}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
atlas_bin="$script_dir/msdf-atlas-gen"
font_name="$(basename "$font_path")"
font_name="${font_name%.*}"

mkdir -p "$output_dir"

"$atlas_bin" \
  -font "$font_path" \
  -charset "$script_dir/charset.txt" \
  -type mtsdf \
  -dimensions 1024 1024 \
  -size 28 \
  -pxrange 12 \
  -pots \
  -pxpadding 1 \
  -format png \
  -imageout "$output_dir/$font_name.png" \
  -json "$output_dir/$font_name.json"
