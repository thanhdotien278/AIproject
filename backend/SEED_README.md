# Database Seed Export/Import Tool

This tool allows you to export all data from your current database and import it on a new PC, ensuring a complete transfer of your conference registration system data.

## Quick Start

### Exporting Data (Current PC)
```bash
npm run seed:export
```

### Importing Data (New PC)
```bash
npm run seed:import
```

## Detailed Instructions

### 1. Export Data from Current PC

On your current PC with the existing database:

```bash
# Export all data
npm run seed:export
```

This will:
- Connect to your current MongoDB database
- Export all collections to JSON files
- Create a `backend/seed-data/` folder with:
  - `users.json` - Admin and user accounts
  - `locations.json` - Conference locations
  - `conferences.json` - Conference details
  - `participants.json` - Registration data
  - `speakers.json` - Speaker information
  - `counters.json` - Participant ID counters
  - `metadata.json` - Export information

### 2. Transfer Data to New PC

Copy the entire `backend/seed-data/` folder to your new PC's project directory at the same location (`backend/seed-data/`).

### 3. Setup New PC

On the new PC:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   - Create `.env` file with your MongoDB connection string
   - Ensure MongoDB is running and accessible

3. **Import Data**
   ```bash
   # Import data (will skip if collections already exist)
   npm run seed:import
   
   # OR force import (will overwrite existing data)
   npm run seed:import -- --force
   ```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run seed:export` | Export all data from current database |
| `npm run seed:import` | Import data (safe - skips existing collections) |
| `npm run seed:import -- --force` | Import data (overwrites existing data) |
| `npm run seed:import -- --help` | Show detailed usage information |

## What Gets Exported/Imported

### Collections Included:
- **Users** - Admin accounts, usernames, encrypted passwords
- **Locations** - Conference venues and their details
- **Conferences** - All conference configurations and settings
- **Participants** - All registration data and participant information
- **Speakers** - Speaker profiles and information
- **Counters** - Participant ID generation counters (maintains sequence)

### Data Relationships:
The import process respects data dependencies:
1. Users, Locations, Speakers (no dependencies)
2. Conferences (depends on Locations)
3. Participants (depends on Conferences)
4. Counters (imported last to maintain ID sequences)

## Important Notes

### Security
- Exported user passwords remain encrypted (bcrypt hashes)
- Environment variables are NOT exported - you must set them up on the new PC
- Email credentials and other sensitive config must be manually configured

### Data Integrity
- Participant IDs and their sequences are preserved
- Conference-participant relationships are maintained
- All registration data and timestamps are preserved

### File Structure
```
backend/
├── seed-data/           # Created by export
│   ├── users.json
│   ├── locations.json
│   ├── conferences.json
│   ├── participants.json
│   ├── speakers.json
│   ├── counters.json
│   └── metadata.json
├── seedExport.js        # Export script
├── seedImport.js        # Import script
└── SEED_README.md       # This file
```

## Troubleshooting

### Export Issues
- **"Could not connect to MongoDB"**: Check your `.env` MONGODB_URI
- **"Permission denied"**: Ensure write permissions for the project directory

### Import Issues
- **"seed-data directory not found"**: Make sure you copied the folder correctly
- **"Collection already exists"**: Use `--force` flag to overwrite, or clear the database first
- **"Validation errors"**: Usually indicates data corruption during transfer

### Common Solutions
```bash
# Check if MongoDB is running
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# Clear all data and re-import
npm run seed:import -- --force

# View import help
npm run seed:import -- --help
```

## Post-Import Verification

After importing, verify your data:

1. **Start the application**
   ```bash
   npm start
   ```

2. **Check admin access**
   - Go to `/admin/login`
   - Use your existing admin credentials

3. **Verify data completeness**
   - Check participant counts match
   - Verify conferences are properly configured
   - Test registration functionality

## Example Workflow

```bash
# On current PC
npm run seed:export
# Copy backend/seed-data/ folder to new PC

# On new PC
git clone <your-repo>
cd <project-directory>
npm install
# Copy .env file or create new one
# Copy seed-data folder to backend/seed-data/
npm run seed:import
npm start
```

## Advanced Usage

### Selective Import
The scripts import all collections by default. To modify this behavior, edit `backend/seedImport.js` and comment out collections you don't want to import.

### Custom Processing
Both scripts can be modified to add custom data processing during export/import. See the comments in the files for guidance.

### Backup Strategy
Regular exports can serve as database backups:
```bash
# Create dated backup
npm run seed:export
mv backend/seed-data backend/backup-$(date +%Y%m%d)
```

---

For more information about the overall project, see the main [README.md](../README.md) file. 