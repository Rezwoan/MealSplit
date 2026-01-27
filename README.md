# MealSplit

MealSplit is a shared room app for 2–4 roommates to track groceries, inventory, and meals while keeping cost splits simple and fair.

## Documentation
- [MealSplit_PRD.md](docs/MealSplit_PRD.md)
- [MealSplit_User_Stories.md](docs/MealSplit_User_Stories.md)

## Local Development

### API (localhost:3001)
1. Copy api/.env.example to api/.env and fill in values.
2. From /api:
	- npm install
	- npm run dev

### Web (localhost:5173)
1. From /web:
	- npm install
	- npm run dev

### Database migrations
Drizzle SQL migrations are generated locally (api/drizzle) and applied manually via phpMyAdmin on cPanel (no SSH).
