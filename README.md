# Mat & Mind

![Mat & Mind](https://via.placeholder.com/800x400?text=Mat+and+Mind)

## Project Overview
Mat & Mind is a distraction-free yoga website that provides access to trusted yoga information from reputable sources. The site offers content on yoga poses, styles, benefits, and practice tips, all sourced from established yoga authorities and professional organizations. The site allows users to focus solely on their yoga practice without the distractions of typical content platforms.

## 🧘‍♀️ Goals
- Create a minimalist, peaceful interface for accessing yoga information
- Provide trustworthy content from reputable yoga sources
- Properly attribute all content to original sources
- Eliminate distracting elements and recommendations
- Categorize content by yoga types, poses, benefits, and practice tips
- Maintain content freshness through automated updates
- Create immersive dark themes for distraction-free reading

## 🛠️ Technologies
- **11ty (Eleventy)**: Static Site Generator
- **HTML/CSS/JavaScript**: Core web technologies
- **Netlify**: Hosting platform
- **Content Management**: Simple content editing system
- **JSON**: For storing structured content data
- **Theme System**: Custom dark themes for immersive reading

## ✨ Features
- Personal knowledge and insights about yoga
- Comprehensive guide sections for different aspects of yoga
- Filtering options by yoga type, benefits, and practice level
- Distraction-free reading experience
- Six immersive dark themes:
  - **Nature Themes**: Forest, Ocean, Beach
  - **Elemental Themes**: Water, Lights, Mountain

## 🗂️ Project Structure
```
mat-and-mind/
├── src/                   # Source files
│   ├── _data/             # JSON data files
│   │   ├── site.json      # Site configuration
│   │   └── content/       # Yoga content data
│   ├── _includes/         # Templates and components
│   │   ├── components/    # Reusable UI components
│   │   ├── guide/         # Guide section components
│   │   └── layouts/       # Page layouts
│   ├── admin/             # Admin interface
│   ├── assets/            # Static assets
│   │   └── themes/        # Theme background images
│   ├── content/           # Content pages
│   │   ├── about/         # About page content
│   │   └── guide/         # Guide page content
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── pages/             # Main site pages
├── scripts/               # Build and utility scripts
│   └── assets/            # Asset management scripts
├── _cache/                # Cached content for development
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
This project includes a simple content management system where you can add your personal knowledge about yoga:

1. **Personal Content**: Add your own knowledge and insights about yoga
2. **Content Structure**: Organized by yoga types, poses, benefits, and practice levels
3. **Easy Editing**: Simple placeholders for adding your content
4. **Wikipedia References**: Links to Wikipedia for additional information

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
- Add your personal content by replacing placeholders in the `src/_data/scraped/*.json` files
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

## 🔄 Content Update Workflow

Mat & Mind makes it easy to update your personal yoga content:

1. Find the appropriate JSON file in `src/_data/scraped/` directory
2. Replace the placeholder text with your personal knowledge
3. Build and preview your changes with `npm start`
4. Deploy your updated site with `npm run build`

This system ensures all content:
- Reflects your personal knowledge and experience
- Is organized in a structured, easy-to-navigate format
- Provides a distraction-free reading experience
- Links to Wikipedia for additional information

## 📜 License
MIT