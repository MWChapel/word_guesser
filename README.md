# Wordle Chooser Web Application

A modern React web application that helps you find the best words for your Wordle game. Built with Material-UI for a beautiful, responsive interface.

## Features

### 🏆 Top Words Display
- Shows the top 10 best starting words based on letter frequency and position scoring
- Each word displays its score and recommended second words
- Visual ranking with medal emojis (🥇🥈🥉)

### 🎮 Advanced Filtering
- **Included Letters**: Specify letters that must be in the word
- **Excluded Letters**: Specify letters that cannot be in the word
- **Exact Pattern**: Use patterns like `*a*e*` to specify known letter positions
- **Exclude Pattern**: Specify letters that cannot be in specific positions

### 📊 Smart Results
- **Valid Answers**: Shows all words matching your criteria, sorted by score
- **Elimination Words**: Suggests words to eliminate more letters from the remaining alphabet
- Real-time filtering with instant results
- Score display for each word

### 🎨 Modern UI
- Material-UI design system
- Responsive layout that works on desktop and mobile
- Smooth animations and hover effects
- Intuitive form inputs with helpful tooltips

## How to Use

### Getting Started
1. Enter letters you know are in the word in "Included Letters"
2. Enter letters you know are NOT in the word in "Excluded Letters"
3. Use patterns like `*a*e*` in "Exact Pattern" for known positions
4. Use patterns like `p*r**` in "Exclude Pattern" for excluded positions
5. Click "Find Words" to see results

### Pattern Examples
- `*a*e*` = word with 'a' in position 2 and 'e' in position 4
- `p*r**` = word where 'p' cannot be in position 1 and 'r' cannot be in position 3
- `*****` = no restrictions (default)

### Understanding Results
- **Valid Answers**: Words that match all your criteria, sorted by score
- **Elimination Words**: Words with no letters in common with your included letters, designed to eliminate more letters from the remaining alphabet

## Technical Details

- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Hooks
- **Data Processing**: Client-side word scoring and filtering
- **Performance**: Optimized algorithms matching the CLI version

## Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
npm install
```

### Running the App
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

### Building for Production
```bash
npm run build
```

## Data Files

The app uses two JSON files in the `public` directory:
- `wordlist.json`: Complete list of valid Wordle words
- `usedlist.json`: Previously used words (excluded from suggestions)

## Algorithm

The word scoring algorithm is identical to the CLI version:
1. Calculates letter frequency across all positions
2. Scores each word based on letter frequency and position
3. Applies vowel bonuses (2x multiplier)
4. Filters for words with unique letters
5. Suggests optimal second words with no letter overlap

## Contributing

Feel free to submit issues and enhancement requests!
