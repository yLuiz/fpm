import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  // Regressão: sem forwardRef (React 18) o menu de ações nunca era posicionado
  it('repassa a ref ao elemento (necessário para gatilhos Radix com asChild)', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ações</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('com asChild repassa a ref ao filho', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <Button asChild ref={ref}>
        <a href="/x">Link</a>
      </Button>
    )
    expect(ref.current?.tagName).toBe('A')
  })
})
