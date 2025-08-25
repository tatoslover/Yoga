/**
 * Static Content Generator for Mat & Mind
 *
 * This script creates static HTML files from mock data without relying on complex templates.
 * It's designed as a fallback when the dynamic content scraping system encounters issues.
 *
 * Usage: node scripts/generate-static-content.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MOCK_DATA_DIR = path.join(__dirname, '../src/_data/scraped');
const OUTPUT_DIR = path.join(__dirname, '../src/_includes/guide');
const SECTIONS = ['benefits', 'tips', 'poses', 'yogaTypes'];

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate static content
async function generateStaticContent() {
  console.log('Generating static content from mock data...');

  // Process each content section
  for (const section of SECTIONS) {
    try {
      // Check for mock data file
      const mockFilePath = path.join(MOCK_DATA_DIR, `mock-${section}.json`);

      if (fs.existsSync(mockFilePath)) {
        console.log(`Processing ${section} from ${mockFilePath}`);

        // Read and parse mock data
        const mockData = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));

        // Generate HTML content
        const htmlContent = generateHtmlForSection(section, mockData);

        // Write to output file
        const outputPath = path.join(OUTPUT_DIR, `${section}.html`);
        fs.writeFileSync(outputPath, htmlContent);

        console.log(`✓ Generated static content for ${section} -> ${outputPath}`);

        // Generate attribution file
        const sources = extractSources(mockData);
        const attributionHtml = generateAttributionHtml(sources);
        const attributionPath = path.join(OUTPUT_DIR, `${section}-attribution.html`);
        fs.writeFileSync(attributionPath, attributionHtml);

        console.log(`✓ Generated attribution for ${section} -> ${attributionPath}`);
      } else {
        console.log(`✗ No mock data found for ${section}`);
      }
    } catch (error) {
      console.error(`✗ Error generating content for ${section}:`, error.message);
    }
  }

  console.log('Static content generation completed!');
}

// Extract sources from mock data
function extractSources(mockData) {
  const sources = [];

  mockData.forEach(item => {
    if (item.source && item.data && item.data.metadata) {
      sources.push({
        name: item.source,
        url: item.data.metadata.url || '#',
        authority: item.data.metadata.authority || 5
      });
    }
  });

  return sources;
}

// Generate HTML content based on section type
function generateHtmlForSection(section, mockData) {
  switch (section) {
    case 'benefits':
      return generateBenefitsHtml(mockData);
    case 'tips':
      return generateTipsHtml(mockData);
    case 'poses':
      return generatePosesHtml(mockData);
    case 'yogaTypes':
      return generateYogaTypesHtml(mockData);
    default:
      return `<!-- No content generator available for ${section} -->`;
  }
}

// Generate benefits HTML
function generateBenefitsHtml(mockData) {
  let html = `<!-- Static content generated from mock data -->
<!-- Last updated: ${new Date().toISOString()} -->\n\n`;

  // Physical benefits
  html += `{% if target == "physical" %}
  <div class="benefits-grid">\n`;

  // Extract physical benefits
  const physicalBenefits = extractCategoryItems(mockData, 'physical');
  physicalBenefits.forEach(benefit => {
    html += `    <div class="benefit-card">
      <h4>${benefit.title || 'Physical Benefit'}</h4>
      <p>${benefit.description || benefit.content || 'Improves physical wellbeing through regular practice.'}</p>
    </div>\n`;
  });

  html += `  </div>
{% endif %}\n\n`;

  // Mental benefits
  html += `{% if target == "mental" %}
  <div class="benefits-grid">\n`;

  // Extract mental benefits
  const mentalBenefits = extractCategoryItems(mockData, 'mental');
  mentalBenefits.forEach(benefit => {
    html += `    <div class="benefit-card">
      <h4>${benefit.title || 'Mental Benefit'}</h4>
      <p>${benefit.description || benefit.content || 'Enhances mental wellbeing and clarity.'}</p>
    </div>\n`;
  });

  html += `  </div>
{% endif %}\n\n`;

  // Lifestyle benefits
  html += `{% if target == "lifestyle" %}
  <div class="benefits-grid">\n`;

  // Extract general benefits as lifestyle
  const lifestyleBenefits = extractCategoryItems(mockData, 'general');
  lifestyleBenefits.forEach(benefit => {
    html += `    <div class="benefit-card">
      <h4>${benefit.title || 'Lifestyle Benefit'}</h4>
      <p>${benefit.description || benefit.content || 'Improves overall quality of life and daily habits.'}</p>
    </div>\n`;
  });

  html += `  </div>
{% endif %}\n\n`;

  // Add sources comment
  html += `<!-- Data from trusted yoga sources -->\n`;

  return html;
}

// Generate tips HTML
function generateTipsHtml(mockData) {
  let html = `<!-- Static content generated from mock data -->
<!-- Last updated: ${new Date().toISOString()} -->\n\n`;

  // Beginner tips
  html += `{% if target == "beginners" %}
  <div class="tips-grid">\n`;

  // Extract beginner tips
  const beginnerTips = extractCategoryItems(mockData, 'beginners');
  beginnerTips.forEach(tip => {
    html += `    <div class="tip-card">
      <h4>${tip.title || 'Beginner Tip'}</h4>
      <p>${tip.content || 'A helpful tip for yoga beginners.'}</p>
    </div>\n`;
  });

  html += `  </div>
{% endif %}\n\n`;

  // Practice tips
  html += `{% if target == "practice" %}
  <div class="tips-grid">\n`;

  // Extract practice tips
  const practiceTips = extractCategoryItems(mockData, 'practice');
  practiceTips.forEach(tip => {
    html += `    <div class="tip-card">
      <h4>${tip.title || 'Practice Tip'}</h4>
      <p>${tip.content || 'A helpful tip for your yoga practice.'}</p>
    </div>\n`;
  });

  html += `  </div>
{% endif %}\n\n`;

  // Props tips
  html += `{% if target == "props" %}
  <div class="tips-grid">\n`;

  // Extract props tips
  const propsTips = extractCategoryItems(mockData, 'props');
  propsTips.forEach(tip => {
    html += `    <div class="tip-card">
      <h4>${tip.title || 'Props Tip'}</h4>
      <p>${tip.content || 'A helpful tip for using yoga props.'}</p>
    </div>\n`;
  });

  html += `  </div>
{% endif %}\n\n`;

  // Add sources comment
  html += `<!-- Data from trusted yoga sources -->\n`;

  return html;
}

// Generate yoga types HTML
function generateYogaTypesHtml(mockData) {
  let html = `<!-- Static content generated from mock data -->
<!-- Last updated: ${new Date().toISOString()} -->\n\n`;

  // Extract all yoga types
  const allTypes = ['Vinyasa', 'Hatha', 'Yin', 'Power', 'Restorative'];

  // Generate content for each type
  allTypes.forEach(yogaType => {
    html += `{% if target == "${yogaType.toLowerCase()}" %}
  <div class="yoga-type-description">
    <p>`;

    // Try to find data for this type
    const typeData = findYogaTypeByName(mockData, yogaType);
    if (typeData) {
      html += typeData.description || `${yogaType} yoga focuses on specific practices and techniques.`;
    } else {
      // Fallback descriptions if no data found
      switch (yogaType.toLowerCase()) {
        case 'vinyasa':
          html += 'Vinyasa yoga is characterized by stringing postures together so that you move from one to another, seamlessly, using breath. Commonly referred to as "flow" yoga, it offers a more dynamic and movement-oriented practice.';
          break;
        case 'hatha':
          html += 'Hatha yoga is a general category that includes most yoga styles. It is an old system that includes the practice of asanas (yoga postures) and pranayama (breathing exercises), which help bring peace to the mind and body.';
          break;
        case 'yin':
          html += 'Yin yoga is a slow-paced style of yoga with postures that are held for longer periods of time. It targets the connective tissues, such as the ligaments, bones, and even the joints of the body that normally are not exercised very much in a more active style of yoga.';
          break;
        case 'power':
          html += 'Power yoga is a fitness-based approach to vinyasa-style yoga. It builds internal heat, increases stamina, strength, and flexibility, as well as stress reduction.';
          break;
        case 'restorative':
          html += 'Restorative yoga is a passive, meditative form of yoga that allows your body to deeply relax and release tension. Props like blankets and bolsters are used to support the body, and postures are held for extended periods of time.';
          break;
        default:
          html += `${yogaType} yoga offers a unique approach to yoga practice with its own specific benefits and techniques.`;
      }
    }

    html += `</p>

    <h4>Benefits</h4>
    <ul>`;

    // Add benefits
    if (typeData && typeData.benefits && typeData.benefits.length > 0) {
      typeData.benefits.forEach(benefit => {
        html += `\n      <li>${benefit}</li>`;
      });
    } else {
      // Fallback benefits
      const fallbackBenefits = {
        'vinyasa': ['Builds heat and endurance', 'Improves cardiovascular fitness', 'Develops strength and flexibility', 'Creates a moving meditation'],
        'hatha': ['Improves flexibility', 'Builds strength', 'Enhances balance', 'Reduces stress', 'Suitable for beginners'],
        'yin': ['Increases flexibility', 'Enhances joint mobility', 'Reduces stress and anxiety', 'Improves circulation', 'Balances the body'],
        'power': ['Builds strength and stamina', 'Improves cardiovascular health', 'Enhances mental focus', 'Burns calories', 'Develops discipline'],
        'restorative': ['Deeply relaxes the body', 'Calms the nervous system', 'Improves sleep quality', 'Reduces stress and anxiety', 'Supports healing']
      };

      const benefits = fallbackBenefits[yogaType.toLowerCase()] || ['Improves overall well-being', 'Enhances physical fitness', 'Promotes mental clarity'];
      benefits.forEach(benefit => {
        html += `\n      <li>${benefit}</li>`;
      });
    }

    html += `\n    </ul>
  </div>
{% endif %}\n\n`;
  });

  // Add sources comment
  html += `<!-- Data from trusted yoga sources -->\n`;

  return html;
}

// Generate poses HTML
function generatePosesHtml(mockData) {
  let html = `<!-- Static content generated from mock data -->
<!-- Last updated: ${new Date().toISOString()} -->\n\n`;

  // Categories to generate
  const categories = ['standing', 'seated', 'backbends', 'inversions', 'twists'];

  // Generate content for each category
  categories.forEach(category => {
    html += `{% if target == "${category}" %}
  <div class="poses-grid">\n`;

    // Extract poses for this category
    const categoryPoses = extractPosesByCategory(mockData, category);

    // If no poses found, add some common ones
    if (categoryPoses.length === 0) {
      const fallbackPoses = getFallbackPoses(category);
      fallbackPoses.forEach(pose => {
        html += generatePoseCard(pose);
      });
    } else {
      // Add actual poses from data
      categoryPoses.forEach(pose => {
        html += generatePoseCard(pose);
      });
    }

    html += `  </div>
{% endif %}\n\n`;
  });

  // Add sources comment
  html += `<!-- Data from trusted yoga sources -->\n`;

  return html;
}

// Generate a pose card
function generatePoseCard(pose) {
  return `    <div class="pose-card">
      <h4>${pose.name || 'Yoga Pose'}</h4>
      <p class="pose-description">${pose.description || 'A beneficial yoga pose that offers numerous health benefits.'}</p>
      ${pose.difficulty ? `<span class="difficulty-badge">${pose.difficulty}</span>` : ''}
    </div>\n`;
}

// Extract items from a specific category across all sources
function extractCategoryItems(mockData, category) {
  const items = [];

  mockData.forEach(source => {
    if (source.data && source.data.data) {
      const data = source.data.data;

      // If data has the category as a direct property (object with arrays)
      if (data[category] && Array.isArray(data[category])) {
        items.push(...data[category]);
      }
      // If data is an array of items with _category property
      else if (Array.isArray(data)) {
        const categoryItems = data.filter(item => item._category === category);
        items.push(...categoryItems);
      }
    }
  });

  // Ensure we return at least some items
  if (items.length === 0) {
    // Return fallback items based on category
    return getFallbackItems(category);
  }

  return items;
}

// Extract poses by category
function extractPosesByCategory(mockData, category) {
  const poses = [];

  mockData.forEach(source => {
    if (source.data && source.data.data && Array.isArray(source.data.data)) {
      const matchingPoses = source.data.data.filter(pose =>
        pose.category === category ||
        pose.type === category ||
        (category === 'standing' && pose.name && pose.name.toLowerCase().includes('stand'))
      );
      poses.push(...matchingPoses);
    }
  });

  return poses;
}

// Find a yoga type by name
function findYogaTypeByName(mockData, typeName) {
  let foundType = null;

  mockData.forEach(source => {
    if (source.data && source.data.data && Array.isArray(source.data.data)) {
      const matchingType = source.data.data.find(type =>
        type.name && type.name.toLowerCase() === typeName.toLowerCase()
      );
      if (matchingType) {
        foundType = matchingType;
      }
    }
  });

  return foundType;
}

// Generate attribution HTML
function generateAttributionHtml(sources) {
  let html = `<div class="content-attribution">
  <h4>Content Sources</h4>
  <p class="last-updated">Last updated: ${new Date().toLocaleDateString()}</p>

  <ul class="sources-list">`;

  sources.forEach(source => {
    html += `
    <li>
      <a href="${source.url}" target="_blank" rel="noopener">${source.name}</a>
    </li>`;
  });

  html += `
  </ul>

  <p class="attribution-notice">Content used for educational purposes with attribution to original sources.</p>
</div>`;

  return html;
}

// Fallback items for different categories
function getFallbackItems(category) {
  const fallbacks = {
    'physical': [
      { title: 'Improved Flexibility', description: 'Regular practice gradually loosens tight muscles and increases range of motion in joints.' },
      { title: 'Increased Strength', description: 'Many yoga poses require supporting your body weight in new ways, building functional strength.' },
      { title: 'Better Posture', description: 'As your flexibility and strength improve, your posture follows. Many poses develop core strength.' },
      { title: 'Joint Health', description: 'Yoga moves joints through their full range of motion, helping prevent degenerative arthritis.' }
    ],
    'mental': [
      { title: 'Stress Reduction', description: 'Yoga is known for its ability to reduce stress and promote relaxation. Practice encourages focusing on the present.' },
      { title: 'Anxiety Relief', description: 'Research suggests yoga can reduce anxiety. The combination of movement, breathwork, and meditation creates a powerful tool.' },
      { title: 'Improved Focus', description: 'Regular yoga practice improves coordination, reaction time, memory, and even IQ scores.' },
      { title: 'Mood Enhancement', description: 'Studies have found that yoga can reduce depression and increase serotonin levels.' }
    ],
    'general': [
      { title: 'Healthier Habits', description: 'Yoga often leads practitioners to adopt healthier lifestyles naturally, including better eating habits.' },
      { title: 'Weight Management', description: 'Regular practice can support healthy weight management by reducing stress and increasing mindfulness around food choices.' },
      { title: 'Improved Breathing', description: 'Yoga teaches proper breathing techniques that can be applied throughout daily life, improving lung function.' },
      { title: 'Community Connection', description: 'Participating in group classes provides social benefits and a sense of belonging, important for long-term health.' }
    ],
    'beginners': [
      { title: 'Start Slow', content: 'Begin with gentler classes like Hatha or slow Vinyasa. Don\'t push yourself too hard too quickly.' },
      { title: 'Focus on Breath', content: 'The breath is your anchor in yoga. When in doubt, return to your breath.' },
      { title: 'Use Props', content: 'Don\'t hesitate to use blocks, straps, and bolsters to support your practice.' },
      { title: 'Find a Good Teacher', content: 'A qualified instructor can help ensure proper alignment and prevent injury.' }
    ],
    'practice': [
      { title: 'Consistency Over Duration', content: 'A short daily practice is more beneficial than one long session per week.' },
      { title: 'Create a Dedicated Space', content: 'Having a specific area for practice helps establish a routine.' },
      { title: 'Practice Mindfully', content: 'Focus on the quality of your movement rather than quantity.' },
      { title: 'Listen to Your Body', content: 'Honor your body\'s limitations and avoid comparing yourself to others.' }
    ],
    'props': [
      { title: 'Yoga Blocks', content: 'Great for bringing the floor closer to you in standing poses and providing support in seated poses.' },
      { title: 'Yoga Straps', content: 'Helpful for extending your reach in forward folds and shoulder openers.' },
      { title: 'Bolsters', content: 'Perfect for restorative poses and supported backbends.' },
      { title: 'Blankets', content: 'Versatile props that can provide cushioning, warmth, and support.' }
    ]
  };

  return fallbacks[category] || [];
}

// Fallback poses by category
function getFallbackPoses(category) {
  const fallbacks = {
    'standing': [
      { name: 'Mountain Pose (Tadasana)', description: 'The foundation of all standing poses, Mountain Pose improves posture, balance, and body awareness.', difficulty: 'Beginner' },
      { name: 'Warrior I (Virabhadrasana I)', description: 'A powerful standing pose that stretches the chest and lungs, shoulders, neck, belly and groin.', difficulty: 'Beginner' },
      { name: 'Tree Pose (Vrikshasana)', description: 'Improves balance, focus, and stability while strengthening the legs and opening the hips.', difficulty: 'Beginner' },
      { name: 'Triangle Pose (Trikonasana)', description: 'Stretches and strengthens the thighs, knees, and ankles while relieving stress.', difficulty: 'Intermediate' }
    ],
    'seated': [
      { name: 'Easy Pose (Sukhasana)', description: 'A comfortable seated position that promotes inner calm and lengthens the spine.', difficulty: 'Beginner' },
      { name: 'Staff Pose (Dandasana)', description: 'Improves posture and strengthens the back while stretching the shoulders and chest.', difficulty: 'Beginner' },
      { name: 'Seated Forward Bend (Paschimottanasana)', description: 'Calms the mind while stretching the spine, shoulders, and hamstrings.', difficulty: 'Intermediate' },
      { name: 'Lotus Pose (Padmasana)', description: 'Opens the hips and creates a stable base for meditation practices.', difficulty: 'Advanced' }
    ],
    'backbends': [
      { name: 'Cobra Pose (Bhujangasana)', description: 'Strengthens the spine while opening the chest and shoulders.', difficulty: 'Beginner' },
      { name: 'Bridge Pose (Setu Bandha Sarvangasana)', description: 'Stretches the chest, neck, and spine while strengthening the back, buttocks, and hamstrings.', difficulty: 'Beginner' },
      { name: 'Camel Pose (Ustrasana)', description: 'Opens the entire front of the body while strengthening the back muscles.', difficulty: 'Intermediate' },
      { name: 'Wheel Pose (Urdhva Dhanurasana)', description: 'A deep backbend that strengthens the arms, legs, abdomen, and spine.', difficulty: 'Advanced' }
    ],
    'inversions': [
      { name: 'Downward-Facing Dog (Adho Mukha Svanasana)', description: 'Strengthens the arms and legs while stretching the shoulders, hamstrings, calves, and hands.', difficulty: 'Beginner' },
      { name: 'Legs-Up-the-Wall Pose (Viparita Karani)', description: 'A restorative inversion that relieves tired legs and feet.', difficulty: 'Beginner' },
      { name: 'Shoulder Stand (Sarvangasana)', description: 'Calms the brain and helps relieve stress and mild depression.', difficulty: 'Intermediate' },
      { name: 'Headstand (Sirsasana)', description: 'Builds strength in the shoulders, arms, and spine while improving focus.', difficulty: 'Advanced' }
    ],
    'twists': [
      { name: 'Seated Spinal Twist (Ardha Matsyendrasana)', description: 'Improves digestion and energizes the spine while relieving back pain.', difficulty: 'Beginner' },
      { name: 'Revolved Chair Pose (Parivrtta Utkatasana)', description: 'Strengthens the legs and spine while improving balance and detoxifying organs.', difficulty: 'Intermediate' },
      { name: 'Revolved Triangle Pose (Parivrtta Trikonasana)', description: 'Strengthens and stretches the legs, spine, and chest while improving balance.', difficulty: 'Intermediate' },
      { name: 'Revolved Side Angle Pose (Parivrtta Parsvakonasana)', description: 'A deep twist that strengthens the legs, abdomen, and spine.', difficulty: 'Advanced' }
    ]
  };

  return fallbacks[category] || [];
}

// Run the script
generateStaticContent().catch(error => {
  console.error('Error generating static content:', error);
  process.exit(1);
});
