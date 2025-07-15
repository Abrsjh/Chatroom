# Claude Code Project Rulebook

## Project Overview
Reddit-style community discussion platform with public channels, threaded discussions, DMs, and real-time messaging capabilities.

## Core Development Principles

### Test-Driven Development (TDD)
- **Always write tests first** - Create failing tests before implementing functionality
- Test structure: Arrange → Act → Assert
- Frontend: Use React Testing Library and Jest
- Backend: Use pytest with FastAPI test client
- Aim for high test coverage on critical business logic

### Code Generation Only
**STRICTLY PROHIBITED:**
- Running system commands (npm install, npm run dev, pip install, etc.)
- Executing build scripts or dev servers
- Installing packages or dependencies
- Running linters, formatters, or any CLI tools

**ALLOWED:**
- Creating and editing files
- Writing code and tests
- Generating configuration files
- Code review and analysis

### Library Constraints
- **No external libraries** unless explicitly specified in project requirements
- Use only approved stack: React, FastAPI, PostgreSQL, Zustand, SQLAlchemy, Vite
- Prefer native browser APIs and standard library functions
- If additional library needed, must be justified and approved first

### Code Quality Standards
- Clean, readable code with descriptive names
- Consistent formatting and structure
- Proper error handling and validation
- Security-first approach (no exposed secrets, SQL injection protection)
- Follow language-specific conventions (PEP 8 for Python, ESLint for JS/TS)

### Project Structure
```
/
├── frontend/          # React + Vite application
├── backend/           # FastAPI application
├── database/          # SQL schemas and migrations
├── memory-bank/       # Project context and documentation
├── CLAUDE.md         # This file
└── PLAN.md           # Execution checklist
```

### Development Workflow
1. Update active context in memory-bank/
2. Write failing tests (TDD)
3. Implement minimal code to pass tests
4. Refactor while keeping tests green
5. Update progress tracking
6. Move to next task in PLAN.md

### Communication Protocol
- Reference code locations as `file_path:line_number`
- Update memory-bank/ files to maintain context
- Mark completed tasks in PLAN.md
- Keep responses concise and actionable