# ResponsiveCreditCard Component

A mobile-first, touch-optimized credit card component built for the CreditAI platform. This component provides a comprehensive solution for displaying credit card information with full responsive design, accessibility features, and modern touch interactions.

## Features

### 🔥 Core Features
- **Mobile-First Design**: Built with mobile devices as the primary target, progressively enhanced for larger screens
- **Touch Optimization**: 44px minimum touch targets, swipe gestures, and haptic feedback support
- **Responsive Variants**: Multiple display variants (default, compact, detailed) for different use cases
- **Progressive Disclosure**: Smart hiding/showing of sensitive information with user control
- **Accessibility First**: WCAG 2.1 AA compliant with comprehensive screen reader and keyboard support

### 📱 Mobile Features
- **Swipe Gestures**: Swipe left/right for quick actions on mobile devices
- **Haptic Feedback**: Tactile feedback on supported devices for better user experience
- **Touch-Friendly Interactions**: All interactive elements meet 44px minimum touch target size
- **Safe Area Support**: Properly handles device notches and safe areas
- **Orientation Handling**: Seamless experience in both portrait and landscape modes

### 🎨 Visual Design
- **Modern UI**: Clean, professional design following credit card industry standards
- **Dark Mode Support**: Full dark mode compatibility with proper contrast ratios
- **Smooth Animations**: Performant animations with respect for reduced motion preferences
- **Status Indicators**: Visual indicators for card status, utilization levels, and confidence scores
- **Brand Recognition**: Support for different card types (Visa, Mastercard, Amex, etc.)

### ♿ Accessibility
- **Screen Reader Support**: Comprehensive ARIA labels and semantic HTML structure
- **Keyboard Navigation**: Full keyboard support with logical focus management
- **High Contrast**: Works with high contrast mode and user accessibility preferences
- **Reduced Motion**: Respects user's motion preferences
- **Focus Management**: Clear focus indicators and logical tab order

## Installation

The component is part of the CreditAI UI library and requires the following dependencies:

```bash
npm install lucide-react class-variance-authority
```

## Basic Usage

```tsx
import { ResponsiveCreditCard } from '@/components/ui/ResponsiveCreditCard'

const creditCard = {
  id: '1',
  cardName: 'Chase Sapphire Preferred',
  cardNumber: '4532123456789012',
  balance: 2850,
  creditLimit: 15000,
  availableCredit: 12150,
  status: 'active',
  provider: 'Chase Bank',
  cardType: 'visa'
}

function MyComponent() {
  return (
    <ResponsiveCreditCard
      card={creditCard}
      onSelect={(cardId) => console.log('Selected:', cardId)}
      onViewDetails={(cardId) => console.log('View details:', cardId)}
    />
  )
}
```

## API Reference

### Props

#### CreditCardData Interface

```typescript
interface CreditCardData {
  id: string
  cardName: string
  cardNumber: string
  expiryDate?: string
  balance: number
  creditLimit: number
  availableCredit: number
  interestRate?: number
  minimumPayment?: number
  lastPaymentDate?: string
  status: 'active' | 'closed' | 'frozen' | 'overlimit'
  provider: string
  cardType: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other'
  isBusinessCard?: boolean
  rewards?: {
    type: 'cashback' | 'points' | 'miles'
    rate: number
    balance: number
  }
  paymentHistory?: Array<{
    date: string
    status: 'ontime' | 'late' | 'missed'
    amount: number
  }>
  confidence?: number
}
```

#### Component Props

```typescript
interface ResponsiveCreditCardProps {
  card: CreditCardData
  variant?: 'default' | 'compact' | 'detailed'
  showSensitiveData?: boolean
  isSelected?: boolean
  isFavorite?: boolean
  className?: string
  onSelect?: (cardId: string) => void
  onToggleFavorite?: (cardId: string) => void
  onViewDetails?: (cardId: string) => void
  onCopyNumber?: (cardNumber: string) => void
  enableSwipeActions?: boolean
  enableHapticFeedback?: boolean
}
```

### Variants

#### Default Variant
The standard credit card display with all essential information visible.

```tsx
<ResponsiveCreditCard card={cardData} variant="default" />
```

#### Compact Variant
A condensed view suitable for lists or when space is limited.

```tsx
<ResponsiveCreditCard card={cardData} variant="compact" />
```

#### Detailed Variant
Extended view showing additional information like rewards, interest rates, and payment history.

```tsx
<ResponsiveCreditCard card={cardData} variant="detailed" />
```

## Advanced Usage

### Custom Styling

```tsx
<ResponsiveCreditCard
  card={cardData}
  className="shadow-xl border-2 border-blue-500"
  variant="detailed"
/>
```

### Event Handling

```tsx
<ResponsiveCreditCard
  card={cardData}
  onSelect={(cardId) => {
    setSelectedCard(cardId)
    analytics.track('card_selected', { cardId })
  }}
  onToggleFavorite={(cardId) => {
    toggleFavorite(cardId)
    showToast('Favorites updated')
  }}
  onViewDetails={(cardId) => {
    router.push(`/cards/${cardId}`)
  }}
  onCopyNumber={(cardNumber) => {
    showToast('Card number copied to clipboard')
  }}
/>
```

### Responsive Layouts

```tsx
// Grid layout that adapts to screen size
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
  {cards.map(card => (
    <ResponsiveCreditCard
      key={card.id}
      card={card}
      variant={isMobile ? 'compact' : 'default'}
    />
  ))}
</div>
```

## Accessibility Guidelines

### Keyboard Navigation

The component supports the following keyboard shortcuts when focused:

- **Enter/Space**: Select the card
- **Ctrl/Cmd + V**: View card details
- **Ctrl/Cmd + C**: Copy card number (when revealed)
- **Ctrl/Cmd + F**: Toggle favorite status

### Screen Reader Support

The component includes comprehensive ARIA labels:

```tsx
// Automatic ARIA labeling
aria-label="Chase Sapphire Preferred credit card, balance $2,850, 19.0% utilization"
aria-pressed={isSelected}
role="button"
tabIndex={0}
```

### Focus Management

- Clear focus indicators with 2px focus rings
- Logical tab order through interactive elements
- Focus trapping within modal overlays
- Skip links for complex card layouts

## Mobile Optimization

### Touch Targets

All interactive elements meet the 44px minimum touch target size:

```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

### Swipe Gestures

Enable swipe actions for mobile devices:

```tsx
<ResponsiveCreditCard
  card={cardData}
  enableSwipeActions={true}
  enableHapticFeedback={true}
/>
```

### Haptic Feedback

The component provides haptic feedback on supported devices:
- Light vibration for selection
- Medium vibration for successful actions
- Heavy vibration for errors or warnings

## Performance Considerations

### Optimization Features

- **Lazy Loading**: Images and non-critical content load on demand
- **Memoization**: React.memo prevents unnecessary re-renders
- **Debounced Events**: Touch and resize events are debounced for performance
- **Efficient Animations**: CSS transforms and opacity for smooth animations

### Bundle Size

The component is designed to be lightweight:
- Core component: ~8KB gzipped
- Dependencies: Lucide React icons, CVA utility
- Total impact: ~12KB gzipped

## Browser Support

### Modern Browsers
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Mobile Browsers
- iOS Safari 13+
- Chrome Mobile 80+
- Samsung Internet 12+

### Feature Detection

The component gracefully degrades features:
- Touch events → Mouse events
- Haptic feedback → Visual feedback only
- Modern CSS → Fallback styles

## Testing

### Unit Tests

```bash
npm test ResponsiveCreditCard
```

### Accessibility Testing

```bash
npm run test:a11y
```

### Visual Regression Testing

```bash
npm run test:visual
```

## Examples

### Card List
```tsx
function CardList({ cards }) {
  return (
    <div className="space-y-4">
      {cards.map(card => (
        <ResponsiveCreditCard
          key={card.id}
          card={card}
          variant="compact"
          onSelect={handleCardSelect}
        />
      ))}
    </div>
  )
}
```

### Card Grid
```tsx
function CardGrid({ cards }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map(card => (
        <ResponsiveCreditCard
          key={card.id}
          card={card}
          variant="default"
          onViewDetails={handleViewDetails}
        />
      ))}
    </div>
  )
}
```

### Featured Card
```tsx
function FeaturedCard({ card }) {
  return (
    <ResponsiveCreditCard
      card={card}
      variant="detailed"
      className="border-primary shadow-lg"
      showSensitiveData={false}
    />
  )
}
```

## Contributing

When contributing to this component:

1. **Mobile First**: Always design for mobile first, then enhance for desktop
2. **Accessibility**: Include ARIA labels and keyboard support for all features
3. **Performance**: Consider bundle size and runtime performance
4. **Testing**: Include unit tests, accessibility tests, and visual regression tests
5. **Documentation**: Update this documentation for any API changes

## License

This component is part of the CreditAI platform and follows the project's licensing terms.

## Changelog

### v1.0.0
- Initial release with mobile-first design
- Touch optimization and swipe gestures
- Comprehensive accessibility support
- Multiple variants (default, compact, detailed)
- Haptic feedback integration
- Full test coverage

---

*Last updated: January 2024*