# Peaceful Yoga Video Collection

![Peaceful Yoga](https://via.placeholder.com/800x400?text=Peaceful+Yoga)

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
peaceful-yoga/
├── _data/             # JSON data files
│   ├── site.json      # Site configuration
│   └── videos.json    # Video collection data
├── _includes/         # Templates and components
│   ├── components/    # Reusable UI components
│   └── layouts/       # Page layouts
├── admin/             # NetlifyCMS admin interface
├── assets/            # Static assets
│   └── themes/        # Theme background images
├── css/               # Stylesheets
│   ├── styles.css     # Main stylesheet
│   └── themes.css     # Theme definitions
├── js/                # JavaScript files
│   ├── main.js        # Main JavaScript
│   ├── video-player.js # Video player functions
│   └── theme-switcher.js # Theme switching functionality
├── videos/            # Video page templates
├── types/             # Yoga type page templates
├── .eleventy.js       # Eleventy configuration
└── netlify.toml       # Netlify deployment config
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or later)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/peaceful-yoga.git
   cd peaceful-yoga
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
- Edit `_data/site.json` to change site-wide settings
- Modify `_data/videos.json` to add/remove videos
- Customize styles in `css/styles.css`
- Update templates in the `_includes` directory
- Add new themes in `css/themes.css`
- Replace theme background images in `assets/themes/`

## 🌙 Dark Themes
The site features six immersive dark themes designed for distraction-free yoga practice:

### Nature Themes
- **Forest Night**: Deep forest greens with moonlight filtering through trees
- **Deep Ocean**: Rich blues and teals with bioluminescent accents
- **Desert Twilight**: Purple-blue desert night with starry skies

### Elemental Themes
- **Flowing Water**: Deep flowing water with ripples and reflections
- **Ember Glow**: Warm embers and gentle flame colors against darkness
- **Misty Night**: Swirling mist and clouds against night sky

Users can switch between themes using the theme switcher in the bottom right corner.

## 📜 License
MIT