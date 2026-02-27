/*
  # Make clients.name column nullable

  ## Purpose
    - Allow clients to be stored with French field names (nom, prenom) without requiring English 'name' field
    - Support flexible client data model for Extrabat integration
    
  ## Changes
    - Remove NOT NULL constraint from 'name' column in clients table
*/

-- Make name column nullable
ALTER TABLE clients ALTER COLUMN name DROP NOT NULL;