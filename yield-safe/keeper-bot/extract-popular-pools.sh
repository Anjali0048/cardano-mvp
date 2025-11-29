#!/bin/bash

# Updated symbols based on actual data
SYMBOLS=(
  "ADA.SPACE_HZCYED"
  "ADA.SNEK_EKDF5L"
  "ADA.DJED_Minswap"
  "ADA.USDC_Minswap"
  "ADA.MINV1LP_WRWZQS"
  "WMT.MIN_3D5KE2"
  "ADA.PZARAT_ITMHM5"
  "ADA.POPSNEK_VV2KWU"
  "ADA.SEAL_VDGDY3"
  "ADA.PEPEZ_X67EZG"
)

echo "{"
echo "  \"popular_pools\": ["

first=true
for symbol in "${SYMBOLS[@]}"; do
  index=$(jq -r --arg sym "$symbol" '.symbol | to_entries[] | select(.value == $sym) | .key' cache/raw-minswap-response.json)
  
  if [ -n "$index" ]; then
    if [ "$first" = false ]; then
      echo ","
    fi
    first=false
    
    jq --argjson idx "$index" '{
      rank: ($idx + 1),
      symbol: .symbol[$idx],
      ticker: .ticker[$idx],
      description: .description[$idx],
      base_currency: .["base-currency"][$idx],
      currency: .currency[$idx]
    }' cache/raw-minswap-response.json | sed 's/^/    /'
  else
    echo "    # Symbol not found: $symbol" >&2
  fi
done

echo ""
echo "  ]"
echo "}"
