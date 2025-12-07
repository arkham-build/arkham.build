#!/bin/bash

# Database dump script for arkham-build API
# Run this inside the db container where PostgreSQL is installed

# Set default output file if not provided
DATE=$(date +%Y-%m-%d)
OUTPUT_FILE=${1:-"/app/src/tests/seeds/test-seeds.sql"}

echo "Dumping database '$POSTGRES_DB' to '$OUTPUT_FILE'..."

{
pg_dump \
  --host="localhost" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --data-only \
  --no-owner \
  --no-privileges \
  --column-inserts \
  --table=card \
  --table=card_resolution \
  --table=cycle \
  --table=data_version \
  --table=encounter_set \
  --table=pack \
  --table=pack_type \
  --table=taboo_set

# Create temp tables for filtered data
psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
  DROP TABLE IF EXISTS temp_filtered_decks;
  DROP TABLE IF EXISTS temp_filtered_users;
  
  -- Create temp table without generated column constraint
  CREATE TABLE temp_filtered_decks (LIKE arkhamdb_decklist INCLUDING ALL);
  ALTER TABLE temp_filtered_decks DROP COLUMN is_searchable;
  
  INSERT INTO temp_filtered_decks
  SELECT id, name, date_creation, date_update, description_md, user_id, 
         investigator_code, investigator_name, is_duplicate, slots, 
         side_slots, ignore_deck_limit_slots, version, xp, xp_spent, 
         xp_adjustment, exile_string, taboo_id, meta, tags, 
         NULL as previous_deck, NULL as next_deck, 
         canonical_investigator_code, like_count, description_word_count
  FROM arkhamdb_decklist WHERE id IN (
    SELECT id FROM (
      (SELECT id FROM arkhamdb_decklist WHERE canonical_investigator_code='08016-08016' ORDER BY like_count DESC LIMIT 10)
      UNION
      (SELECT id FROM arkhamdb_decklist WHERE canonical_investigator_code='06005-06005' ORDER BY like_count DESC LIMIT 10)
      UNION
      (SELECT id FROM arkhamdb_decklist WHERE canonical_investigator_code='05001-05001' ORDER BY like_count DESC LIMIT 10)
      UNION
      (SELECT id FROM arkhamdb_decklist WHERE canonical_investigator_code='01001-01001' ORDER BY like_count DESC LIMIT 10)
      UNION
      (SELECT id FROM arkhamdb_decklist WHERE canonical_investigator_code='90024-01001' ORDER BY like_count DESC LIMIT 10)
      UNION
      (SELECT id FROM arkhamdb_decklist WHERE canonical_investigator_code='01001-90024' ORDER BY like_count DESC LIMIT 10)
      UNION
      (SELECT id FROM arkhamdb_decklist WHERE canonical_investigator_code='90024-90024' ORDER BY like_count DESC LIMIT 10)
    ) subq
  );
  
  CREATE TABLE temp_filtered_users AS
  SELECT DISTINCT u.* FROM arkhamdb_user u
  INNER JOIN temp_filtered_decks d ON u.id = d.user_id;
" > /dev/null

# Dump filtered data (users first to satisfy foreign keys)
{
echo ""
echo "-- Corresponding arkhamdb_user data"
pg_dump \
  --host="localhost" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --data-only \
  --no-owner \
  --no-privileges \
  --column-inserts \
  --table=temp_filtered_users | sed 's/temp_filtered_users/arkhamdb_user/g'

echo ""
echo "-- Filtered arkhamdb_decklist data (top 10 per investigator)"
pg_dump \
  --host="localhost" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --data-only \
  --no-owner \
  --no-privileges \
  --column-inserts \
  --table=temp_filtered_decks | sed 's/temp_filtered_decks/arkhamdb_decklist/g'
}

# Clean up temp tables
psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
  DROP TABLE IF EXISTS temp_filtered_decks;
  DROP TABLE IF EXISTS temp_filtered_users;
" > /dev/null

} > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
  echo "Database dump completed successfully: $OUTPUT_FILE"
else
  echo "Database dump failed!"
  exit 1
fi