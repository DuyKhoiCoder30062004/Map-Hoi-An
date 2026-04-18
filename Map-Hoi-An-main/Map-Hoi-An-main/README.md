# Map-Hoi-An

## Features
- Interactive map with restaurant locations
- AI-powered voice guidance in multiple languages
- User authentication and admin dashboard
- Real-time GPS tracking
- Audio playback with base64 encoding

## Installation
1. Clone the repository
2. Copy `.env.example` to `.env` and configure your environment variables
3. Install backend dependencies: `pip install -r back_end/requirements.txt`
4. Install frontend dependencies: `npm install` in front_end/front_end/
5. Set up PostgreSQL database with PostGIS extension
6. Run backend: `python back_end/main.py`
7. Run frontend: `npm run dev` in front_end/front_end/

## Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Open a pull request

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## API Documentation
The backend provides RESTful APIs for:
- Authentication: `/api/register`, `/api/login`
- Restaurants: `/api/nearby`, `/api/restaurants`
- AI Services: `/api/translate`, `/api/tts`
- Statistics: `/api/stats`

See the backend code in `back_end/main.py` for detailed endpoint documentation.

## Acknowledgments
- Google Gemini API for AI text generation
- ElevenLabs for high-quality text-to-speech
- FastAPI and React communities for excellent frameworks
- Leaflet for mapping functionality
- PostGIS for geospatial database support