import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Segmented } from './segmented'

const options = [
  { value: 'OK', label: 'OK' },
  { value: 'NOK', label: 'Não OK' },
] as const

describe('Segmented', () => {
  it('expõe um grupo de rádio acessível e indica a opção marcada', () => {
    render(<Segmented aria-label="Ruído ok" value="NOK" options={[...options]} onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'Ruído ok' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Não OK' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'OK' })).toHaveAttribute('aria-checked', 'false')
  })

  it('avisa a opção clicada', async () => {
    const onChange = vi.fn()
    render(<Segmented aria-label="x" value={undefined} options={[...options]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'OK' }))
    expect(onChange).toHaveBeenCalledWith('OK')
  })
})
