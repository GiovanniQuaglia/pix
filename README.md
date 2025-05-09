# PixiJS Test

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── main.ts           # Application entry point
├── Game.ts           # Main game class
├── components/       # Reusable components
└── scenes/           # Scene implementations
    ├── AceOfShadowsScene.ts
    ├── MagicWordsScene.ts
    └── PhoenixFlameScene.ts
```

## Further improvements

- Eventually create a sprite atlas for the images to improve performance
- Improve emoji positioning and text newline 