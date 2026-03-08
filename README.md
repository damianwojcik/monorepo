# Monorepo Overview

This monorepo contains two applications: Axion and Nevis. Each application is structured to facilitate development and deployment, with its own configuration files and source code.

## Applications

### Axion
- **Location**: `/apps/axion`
- **Description**: Axion is an application that initializes a server, sets up middleware, and defines routes for handling requests.
- **Entry Point**: `src/app.ts`
- **Configuration**: 
  - `package.json`: Contains dependencies and scripts specific to Axion.
  - `tsconfig.json`: TypeScript configuration for compiling the Axion application.
  - `README.md`: Documentation for setting up and using the Axion application.

### Nevis
- **Location**: `/apps/nevis`
- **Description**: Nevis is another application similar to Axion, designed to handle requests and manage routes.
- **Entry Point**: `src/app.ts`
- **Configuration**: 
  - `package.json`: Contains dependencies and scripts specific to Nevis.
  - `tsconfig.json`: TypeScript configuration for compiling the Nevis application.
  - `README.md`: Documentation for setting up and using the Nevis application.

## Getting Started

To get started with the monorepo, follow these steps:

1. Clone the repository.
2. Navigate to the root directory of the monorepo.
3. Install dependencies for both applications:
   - For Axion: `cd apps/axion && npm install`
   - For Nevis: `cd apps/nevis && npm install`
4. Run the applications:
   - For Axion: `npm start` (from the `/apps/axion` directory)
   - For Nevis: `npm start` (from the `/apps/nevis` directory)

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.