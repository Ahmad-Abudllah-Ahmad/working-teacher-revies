# Teacher Review Platform

A modern, responsive React web application where students can anonymously review and rate teachers. The platform includes an AI engine that analyzes comments to compute metrics and displays both numerical averages and star-based ratings.

## Features

- **Anonymous Reviews**: Students can select a teacher, view their profile, and submit text comments along with optional ratings.
- **AI-Driven Analytics**: NLP parses each comment to assign scores on four key metrics:
  - Overall Grade
  - Teaching Quality
  - Attendance & Availability
  - Professional Behavior
- **Star Ratings**: Display both AI-inferred and student-entered averages as star ratings.
- **Teacher Profiles**: Shows teacher photo, bio, years of experience, field of study, and aggregated ratings.
- **Admin Panel**: Secure creator-only panel for bulk importing teacher data, uploading photos, and moderating reviews.

## Tech Stack

- **Frontend**:
  - React 18+
  - TypeScript
  - Tailwind CSS for styling
  - React Router for navigation
  - Context API and React Query for state management

- **Backend** (to be implemented):
  - Node.js/Express or Django/Flask
  - PostgreSQL or MongoDB for database
  - JWT for authentication
  - AI/NLP using Hugging Face Transformers or OpenAI API

## Getting Started

### Prerequisites
- Node.js 16.x or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd teacher-review-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

## Project Structure

```
teacher-review-app/
├── src/
│   ├── components/      # Reusable components
│   ├── pages/           # Page components
│   ├── api/             # API services
│   ├── context/         # React context providers
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utility functions
│   ├── assets/          # Static assets like images
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Entry point
├── public/              # Public assets
└── ...                  # Config files
```

## Current Implementation

This initial version includes:

- Home page with a list of teachers
- Teacher profile page with details and reviews
- Review submission form
- Admin panel with login and dashboard
- Responsive UI with Tailwind CSS

## Future Enhancements

- Backend implementation with real API integration
- AI sentiment analysis integration
- User authentication system
- Photo upload functionality
- Advanced review filtering and sorting
- Comprehensive admin dashboard with analytics

## License

[MIT](LICENSE)

## Acknowledgements

- React team for the amazing library
- Tailwind CSS for the utility-first CSS framework
- Open source community for inspiration and tools 