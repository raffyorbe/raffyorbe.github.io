# raffyorbe.com
This project is my personal portfolio website showcasing my work in Product UX Design, Frontend Development, and End-to-End Product Execution. It also includes a custom AI chat assistant powered by GPT-5 mini via OpenAI API that can answer questions about my background, experience, and projects.

The goal of this project was not only to present my work but also to demonstrate practical full-stack development skills, including frontend UI development, API integration, and deployment.

## Features
- Custom UI/UX design
- Web and mobile responsive
- Interactive AI chat assistant
- Backend API for AI responses
- Cloud deployment

The AI assistant acts as a digital version of me, trained to answer questions about my resume, skills, and professional experience.

## Tech Stack
- HTML5
- CSS3
- JavaScript

The UI was designed and built from scratch with a focus on clean layout, responsive design, and usability. It is hosted using GitHub Pages, which serves the portfolio as a static website. The AI chat interface is embedded directly into the portfolio page and styled to match the overall visual system of the site.

## AI Integration
- OpenAI API
- GPT-5 Mini

The AI assistant is configured to:
- Answer questions about my professional background
- Discuss my portfolio projects
- Explain my skills and experience
- Provide information based on my resume

A system prompt constrains the assistant so it behaves like an AI version of me and stays within the scope of my professional profile. Sensitive configuration such as API keys are stored securely using environment variables and are not included in the repository.

## Backend
To securely communicate with the OpenAI API, a lightweight backend service is deployed on Render.
This service acts as a proxy between the frontend chat interface and the OpenAI API. The proxy handles requests from the website and forwards them to the OpenAI API while keeping sensitive credentials secure.

## Security
Sensitive information such as API keys is never stored in the frontend code or in this repository. These credentials are managed securely through environment variables in the deployment environment.


