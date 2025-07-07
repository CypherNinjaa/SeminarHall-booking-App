# Copilot Instructions for Seminar Hall Booking App

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a React Native Expo app for booking seminar halls. The app is built with TypeScript and follows modern React Native development practices.

## Development Guidelines

### Code Style

- Use TypeScript for all new files
- Follow React Native best practices
- Use functional components with hooks
- Implement proper error handling
- Use meaningful variable and function names
- Add appropriate comments for complex logic

### Project Structure

- `components/` - Reusable UI components
- `screens/` - App screens/pages
- `navigation/` - Navigation configuration
- `services/` - API calls and business logic
- `types/` - TypeScript type definitions
- `utils/` - Utility functions
- `assets/` - Images, fonts, and other static assets

### Features to Implement

- User authentication (login/register)
- Hall browsing and search
- Booking management
- User profile management
- Calendar integration
- Push notifications
- Offline support

### UI/UX Guidelines

- Use modern, clean design
- Implement responsive layouts
- Follow Material Design or Apple HIG principles
- Ensure accessibility compliance
- Use consistent color scheme and typography

### State Management

- Use React hooks for local state
- Consider Context API or Redux for global state
- Implement proper data caching strategies

### API Integration

- Use async/await for API calls
- Implement proper error handling
- Add loading states for better UX
- Use TypeScript interfaces for API responses

## Specific Coding Rules for GitHub Copilot

### TypeScript & Type Safety

- Always use strict TypeScript typing - no `any` types
- Define interfaces for all API responses, props, and complex objects
- Use union types for status fields (e.g., 'pending' | 'confirmed' | 'cancelled')
- Import types from `src/types/index.ts` when available
- Use proper typing for React Navigation parameters

### Component Development

- All components should be functional components with TypeScript
- Use `React.FC<Props>` or explicit prop typing
- Implement proper prop validation and default values
- Use meaningful component and file names (PascalCase for components)
- Add accessibility props (accessibilityLabel, accessibilityHint)
- Implement error boundaries for critical components

### State Management Patterns

- Use `useState` for local component state
- Use `useEffect` with proper dependency arrays
- Implement custom hooks for complex logic reuse
- Use `useCallback` and `useMemo` for performance optimization
- Consider Context API for global state (auth, theme, etc.)

### Styling Guidelines

- **NO TAILWIND CSS** - Use React Native's StyleSheet API exclusively
- Import theme constants from `src/constants/theme.ts` for consistency
- Use the predefined color palette, typography, and spacing values
- Create styled components using StyleSheet.create() for performance
- Use inline styles only for dynamic values or one-off adjustments
- Leverage Expo Linear Gradient for beautiful backgrounds
- Use the defined shadow and elevation constants for depth

### UI/UX Implementation Rules

- Use consistent spacing (multiples of 4: 4, 8, 12, 16, 20, 24px)
- Primary color: #007AFF (iOS blue)
- Success: #28A745, Warning: #FFC107, Error: #DC3545
- Use SafeAreaView for all screen containers
- Implement proper loading states with spinners or skeletons
- Add haptic feedback for important actions
- Use proper shadow and elevation for cards
- Implement dark mode support considerations

### API Service Architecture

- Create service files in `src/services/` for each entity (auth, halls, bookings)
- Use axios or fetch with proper error handling
- Implement retry logic for failed requests
- Add request/response interceptors for auth tokens
- Use proper HTTP status code handling
- Implement offline data caching with AsyncStorage

### Navigation Rules

- Use typed navigation with proper param lists
- Implement proper screen options (headerTitle, headerStyle)
- Use proper navigation methods (navigate, push, replace, goBack)
- Add proper navigation guards for protected routes
- Implement deep linking support

### Form Handling

- Use controlled components for all form inputs
- Implement proper form validation (email, phone, required fields)
- Show real-time validation feedback
- Use proper keyboard types (email-address, numeric, etc.)
- Implement proper focus management and tab order
- Add proper error states and success feedback

### Data Management

- Use proper data fetching patterns (loading, success, error states)
- Implement optimistic updates for better UX
- Use proper pagination for large datasets
- Implement proper refresh functionality (pull-to-refresh)
- Cache data appropriately with expiration strategies

### Error Handling Standards

- Never leave empty catch blocks
- Use proper error types and messages
- Implement user-friendly error messages
- Log errors appropriately for debugging
- Implement retry mechanisms for transient errors
- Use proper fallback UI for error states

### Performance Guidelines

- Use FlatList for large lists instead of ScrollView
- Implement proper image optimization and lazy loading
- Use proper key props for list items
- Avoid inline functions in render methods
- Implement proper cleanup in useEffect hooks
- Use React.memo for expensive components

### Security Considerations

- Never store sensitive data in plain text
- Use proper token storage with encrypted storage
- Implement proper input validation and sanitization
- Use HTTPS for all API calls
- Implement proper authentication checks
- Add proper session management

### Testing Approach

- Write unit tests for utility functions
- Test custom hooks thoroughly
- Mock API calls in tests
- Test error scenarios and edge cases
- Implement integration tests for critical flows
- Use proper test data and fixtures

### Code Organization

- Keep components under 200 lines when possible
- Extract complex logic into custom hooks
- Use proper file naming conventions
- Organize imports: React, libraries, local components, types
- Add proper JSDoc comments for complex functions
- Use proper folder structure and file organization

### Accessibility Requirements

- Add proper accessibility labels and hints
- Implement proper focus management
- Use semantic HTML elements where applicable
- Test with screen readers
- Implement proper color contrast ratios
- Add proper touch target sizes (minimum 44px)

### Platform-Specific Considerations

- Use Platform.OS checks when needed
- Implement proper iOS and Android specific styling
- Use proper native module integrations
- Handle platform-specific permissions properly
- Implement proper keyboard handling for both platforms
