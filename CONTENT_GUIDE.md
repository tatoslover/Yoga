# Mat & Mind Content Guide

This guide explains how to add your personal content to the Mat & Mind yoga website.

## Overview

Mat & Mind is designed to showcase your personal knowledge and insights about yoga. You can easily customize all content by editing the JSON files in the `src/_data/content` directory.

## Content Structure

The website's content is organized into several categories:

1. **Yoga Types** - Different styles of yoga (Hatha, Vinyasa, etc.)
2. **Yoga Poses** - Various yoga poses organized by level and type
3. **Benefits** - The physical, mental, and spiritual benefits of yoga
4. **Practice Tips** - Tips for yoga practitioners of different levels

## Editing Content Files

All content is stored in JSON files in the `src/_data/content` directory:

- `yogaTypes.json` - Information about different yoga styles
- `poses.json` - Information about yoga poses
- `benefits.json` - Information about yoga benefits
- `tips.json` - Tips for yoga practice

### Example: Editing Yoga Types

To update information about yoga types, edit the `yogaTypes.json` file:

1. Open the file in your text editor
2. Find the yoga type you want to edit (e.g., "Hatha")
3. Update the "description", "philosophy", "benefits", and "suitableFor" fields
4. Save the file

```json
{
  "Hatha": {
    "description": "Hatha yoga is a traditional form that emphasizes holding postures for longer periods while focusing on alignment and breath.",
    "philosophy": "Hatha focuses on balancing opposing forces and energies in the body. It's considered the foundation for many modern yoga styles.",
    "benefits": "Improves flexibility, strength, and posture while reducing stress. The slower pace allows for deeper exploration of poses.",
    "suitableFor": "Perfect for beginners learning the fundamentals, those recovering from injury, or practitioners seeking a more mindful practice."
  }
}
```

### Example: Editing Yoga Poses

To update information about yoga poses, edit the `poses.json` file:

```json
{
  "beginner": [
    {
      "name": "Mountain Pose (Tadasana)",
      "description": "A foundational standing pose that improves posture and balance. The body is aligned and grounded with feet together, shoulders relaxed, and gaze forward.",
      "benefits": "Improves posture, body awareness, and mental focus."
    }
  ]
}
```

### Example: Editing Benefits

To update information about yoga benefits, edit the `benefits.json` file:

```json
{
  "physical": [
    "Yoga improves flexibility by gently stretching your muscles and increasing your range of motion in joints.",
    "Regular practice builds strength in both large and small muscle groups throughout the entire body.",
    "The focus on proper alignment and body awareness helps improve posture and balance."
  ]
}
```

### Example: Editing Tips

To update information about yoga practice tips, edit the `tips.json` file:

```json
{
  "beginners": [
    {
      "title": "Start Slow and Build Gradually",
      "content": "If you're new to yoga, start with gentler classes like Hatha or slower-paced Vinyasa. Begin with shorter sessions (20-30 minutes) and gradually increase duration as your body adapts."
    }
  ]
}
```

## Testing Your Changes

After editing the content files:

1. Run the development server:
   ```bash
   npm start
   ```

2. View your changes at `http://localhost:8080`

3. If everything looks good, build the site for production:
   ```bash
   npm run build
   ```

## Tips for Writing Quality Content

1. **Be Authentic**: Share your personal knowledge and experiences with yoga
2. **Be Clear**: Use simple, straightforward language
3. **Be Accurate**: Ensure your descriptions are anatomically correct
4. **Be Inclusive**: Consider practitioners of different abilities
5. **Be Mindful**: Focus on both physical and mental aspects of yoga

## Content Guidelines

1. **Attribution**: If you reference specific yoga traditions or teachers, acknowledge them
2. **Accessibility**: Include modifications or alternatives for challenging poses
3. **Safety**: Always mention important safety considerations
4. **Balance**: Cover both physical and spiritual aspects of yoga
5. **Voice**: Maintain a consistent, supportive tone throughout

## Need Help?

If you have any questions about editing the content, please refer to the project README or contact the project maintainer.

Happy editing, and namaste! 🧘‍♀️