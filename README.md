# Mat & Mind

![Mat & Mind](https://via.placeholder.com/800x400?text=Mat+and+Mind)

## Project Overview
This is a distraction-free yoga video collection website that provides access to curated YouTube yoga videos without the temptations of recommendation algorithms and other distracting elements. The site allows users to focus solely on their yoga practice while still leveraging cloud-hosted content.

## 🧘‍♀️ Goals
- Create a minimalist, peaceful interface for viewing yoga videos
- Avoid YouTube addiction by eliminating recommendations and distractions
- Keep videos in the cloud to save local storage
- Provide useful video controls (fullscreen, 15-second jumps, etc.)
- Include brief descriptions for each video
- Categorize videos by type, difficulty, and duration
- Create immersive dark themes for distraction-free practice

## 🛠️ Technologies
- **11ty (Eleventy)**: Static Site Generator
- **HTML/CSS/JavaScript**: Core web technologies
- **Netlify**: Hosting platform
- **YouTube Embed API**: For video playback with custom controls
- **NetlifyCMS**: For content management
- **JSON**: For storing video collection data
- **Theme System**: Custom dark themes for immersive practice

## ✨ Features
- Responsive grid layout of video thumbnails
- Minimalist video player with custom controls
- Filtering options by yoga type, duration, and difficulty
- Brief descriptions for each video
- Distraction-free viewing experience
- Content management system for easy updates
- Six immersive dark themes:
  - **Nature Themes**: Forest Night, Deep Ocean, Desert Twilight
  - **Elemental Themes**: Flowing Water, Ember Glow, Misty Night

## 🗂️ Project Structure
```
mat-and-mind/
├── src/                   # Source files
│   ├── _data/             # JSON data files
│   │   ├── site.json      # Site configuration
│   │   └── videos.json    # Video collection data
│   ├── _includes/         # Templates and components
│   │   ├── components/    # Reusable UI components
│   │   ├── guide/         # Guide section components
│   │   └── layouts/       # Page layouts
│   ├── admin/             # NetlifyCMS admin interface
│   ├── assets/            # Static assets
│   │   └── themes/        # Theme background images
│   ├── content/           # Content pages
│   │   ├── about/         # About page content
│   │   ├── guide/         # Guide page content
│   │   └── videos/        # Video page content
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── pages/             # Main site pages
├── scripts/               # Build and utility scripts
├── _site/                 # Build output directory
├── .eleventy.js           # Eleventy configuration
└── netlify.toml           # Netlify deployment config
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or later)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mat-and-mind.git
   cd mat-and-mind
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. View the site at `http://localhost:8080`

## 📝 Content Management
This project includes NetlifyCMS for content management. After deploying to Netlify:

1. Enable Netlify Identity in your Netlify site settings
2. Configure Git Gateway
3. Access the admin interface at `/admin`
4. Invite users to manage content

## 🚢 Deployment
The site is designed to be deployed on Netlify with continuous deployment from a GitHub repository.

1. Push your repository to GitHub
2. Create a new site in Netlify
3. Connect to your GitHub repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `_site`

## 💻 Local Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 🔧 Customization
- Edit `src/_data/site.json` to change site-wide settings
- Modify `src/_data/videos.json` to add/remove videos
- Customize styles in `src/css/styles.css`
- Update templates in the `src/_includes` directory
- Add new themes in `src/css/themes.css`
- Replace theme background images in `src/assets/themes/`

## 🌙 Dark Themes
The site features six immersive dark themes designed for distraction-free yoga practice:

### Nature Themes
- **Forest**: Deep forest greens with moonlight filtering through trees
- **Ocean**: Rich blues and teals with underwater scenery
- **Beach**: Tranquil beach at sunset with mountains

### Elemental Themes
- **Water**: Flowing water with ripples and reflections
- **Lights**: Soft glowing lights against a dark background
- **Mountain**: Mountain landscape with water reflections

Users can switch between themes using the theme switcher in the bottom right corner.

## 📜 License
MIT