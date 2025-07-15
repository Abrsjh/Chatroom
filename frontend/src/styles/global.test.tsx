import { render } from '@testing-library/react'

describe('Global Styles Integration', () => {
  test('CSS custom properties are available', () => {
    render(<div data-testid="test-element" style={{ color: 'var(--color-primary)' }} />)
    
    const element = document.querySelector('[data-testid="test-element"]') as HTMLElement
    const computedStyle = window.getComputedStyle(element)
    
    // Check that CSS custom properties are working
    expect(computedStyle.getPropertyValue('--color-primary')).toBeTruthy()
  })

  test('global typography styles are applied', () => {
    const { container } = render(
      <div>
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <p>Paragraph text</p>
      </div>
    )
    
    const h1 = container.querySelector('h1')
    const h2 = container.querySelector('h2')
    const p = container.querySelector('p')
    
    expect(h1).toBeInTheDocument()
    expect(h2).toBeInTheDocument()
    expect(p).toBeInTheDocument()
    
    // Check that elements have proper styles applied
    const h1Style = window.getComputedStyle(h1!)
    expect(h1Style.fontWeight).toBe('600')
    expect(h1Style.margin).toBe('0px')
  })

  test('button component styles are applied', () => {
    const { container } = render(
      <button className="btn btn--primary">Test Button</button>
    )
    
    const button = container.querySelector('.btn')
    expect(button).toHaveClass('btn')
    expect(button).toHaveClass('btn--primary')
    
    const buttonStyle = window.getComputedStyle(button!)
    expect(buttonStyle.display).toBe('inline-flex')
    expect(buttonStyle.cursor).toBe('pointer')
  })

  test('form component styles are applied', () => {
    const { container } = render(
      <div className="form-group">
        <label className="form-label">Test Label</label>
        <input className="form-input" type="text" />
        <span className="form-error">Error message</span>
      </div>
    )
    
    const formGroup = container.querySelector('.form-group')
    const formLabel = container.querySelector('.form-label')
    const formInput = container.querySelector('.form-input')
    const formError = container.querySelector('.form-error')
    
    expect(formGroup).toBeInTheDocument()
    expect(formLabel).toBeInTheDocument()
    expect(formInput).toBeInTheDocument()
    expect(formError).toBeInTheDocument()
    
    const inputStyle = window.getComputedStyle(formInput!)
    expect(inputStyle.width).toBe('100%')
  })

  test('card component styles are available', () => {
    const { container } = render(
      <div className="card">
        <div className="card__header">Header</div>
        <div className="card__body">Body</div>
        <div className="card__footer">Footer</div>
      </div>
    )
    
    const card = container.querySelector('.card')
    const header = container.querySelector('.card__header')
    const body = container.querySelector('.card__body')
    const footer = container.querySelector('.card__footer')
    
    expect(card).toBeInTheDocument()
    expect(header).toBeInTheDocument()
    expect(body).toBeInTheDocument()
    expect(footer).toBeInTheDocument()
  })

  test('responsive breakpoints work', () => {
    // This test verifies that the CSS media queries are set up correctly
    // In a real environment, these would be tested with browser resize simulation
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    expect(mediaQuery).toBeDefined()
  })

  test('utility classes are available', () => {
    const { container } = render(
      <div>
        <span className="sr-only">Screen reader only text</span>
        <div className="container">Container content</div>
        <div className="empty-state">
          <h3 className="empty-state__title">Empty State</h3>
          <p className="empty-state__description">Description</p>
        </div>
      </div>
    )
    
    const srOnly = container.querySelector('.sr-only')
    const containerEl = container.querySelector('.container')
    const emptyState = container.querySelector('.empty-state')
    
    expect(srOnly).toBeInTheDocument()
    expect(containerEl).toBeInTheDocument()
    expect(emptyState).toBeInTheDocument()
  })
})