# Video Annotation Tool

A modern React-based video annotation tool for curating and labeling video datasets. Built with TypeScript, Vite, and best React practices.

## Features

- **Video Player**: Full-featured video player with controls
- **Annotation Fields**:
  - Source (Real/Generated)
  - Character Type (Human/Human-Like/Non-Human)
  - Direction (Straight/Up/Down/Left/Right/Multiple)
  - Size (Small/Medium/Large)
  - Include/Exclude
  - Category (Simple/Complex)
  - Notes (free-form text)
- **Progress Tracking**: Real-time statistics on annotation progress
- **Keyboard Shortcuts**:
  - Arrow Right: Next video
  - Arrow Left: Previous video
  - Spacebar: Play/Pause video
- **Auto-save**: Annotations saved in memory as you work
- **CSV Export**: Export all annotations to CSV file
- **Jump Navigation**: Jump to any video by number

## Setup

### Prerequisites

- Node.js 18+
- AWS credentials configured in `../.env` (parent directory)
- S3 bucket with `final_meta_ui.csv` at `LIPSYNC_V1/final_meta_ui.csv`

### Installation

```bash
cd lipsync_videos
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:5175

### Build for Production

```bash
npm run build
```

## Project Structure

```
lipsync_videos/
├── src/
│   ├── components/          # React components
│   │   ├── VideoPlayer.tsx  # Video player component
│   │   ├── AnnotationPanel.tsx  # Annotation form
│   │   ├── ButtonGroup.tsx  # Reusable button group
│   │   ├── StatisticsPanel.tsx  # Progress statistics
│   │   ├── ProgressBar.tsx  # Header with progress
│   │   └── LoadingState.tsx  # Loading/error states
│   ├── hooks/               # Custom React hooks
│   │   ├── useVideoData.ts  # Fetch videos/annotations from S3
│   │   ├── useAnnotations.ts  # Manage annotations
│   │   └── useStatistics.ts  # Calculate statistics
│   ├── utils/               # Utility functions
│   │   └── csv.ts           # CSV parsing/generation
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
└── api/
    ├── fetch-csv.ts         # Fetch CSV from S3
    └── save-annotations.ts  # Save annotations to S3
```

## Data Format

### final_meta_ui.csv (on S3)

```csv
path,source,content_type,direction,size,include,category,notes,last_updated
https://s3.../video1.mp4,real,human,straight,medium,include,simple,Sample note,2025-11-07
```

The app fetches this CSV from S3 on startup:
- **Video List**: Extracted from the `path` column (each path becomes a video to annotate)
- **Existing Annotations**: Loaded from all other columns

## Usage

1. Ensure AWS credentials are in `../.env`
2. Run `npm run dev`
3. App automatically fetches video list and annotations from S3
4. Annotate videos using the form on the right
5. Use arrow keys or buttons to navigate between videos
6. Annotations are automatically saved back to S3 as you work

## Architecture

### Component Design

- **Functional Components**: All components are functional with hooks
- **TypeScript**: Fully typed for type safety
- **CSS Modules**: Scoped styles using .css files per component
- **Custom Hooks**: Logic separated into reusable hooks

### State Management

- **Local State**: React useState for UI state
- **Computed State**: useMemo for derived values (statistics)
- **Side Effects**: useEffect for data loading

### Data Flow

1. `useVideoData` fetches CSV from S3 via `/api/fetch-csv` on mount
2. Video list is extracted from CSV `path` column
3. Existing annotations are loaded from CSV
4. `useAnnotations` manages annotation state and auto-saves to S3
5. `useStatistics` computes real-time statistics from annotations
6. All state flows down through props
7. Events flow up through callbacks

## Best Practices Used

- ✅ TypeScript for type safety
- ✅ Functional components with hooks
- ✅ Custom hooks for logic separation
- ✅ Proper state management
- ✅ Clean component structure
- ✅ CSS organization per component
- ✅ Keyboard accessibility
- ✅ Loading and error states
- ✅ Responsive design
- ✅ Clean code organization

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Technology Stack

- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **CSS**: Vanilla CSS with modern features
- **ESLint**: Code linting

## Port Configuration

The development server runs on port **5175** by default (configured in `vite.config.ts`). This avoids conflicts with other projects.

## Notes

- Video list is automatically fetched from S3 CSV on startup
- Annotations are automatically saved to S3 as you work
- The tool merges new annotations with existing CSV data on S3
- All fields are optional except `path` (auto-filled from S3 URLs)
- Keyboard shortcuts work when not typing in input fields
- Videos must be accessible via their S3 URLs (CORS configured properly)
