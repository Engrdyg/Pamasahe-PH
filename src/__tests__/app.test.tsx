import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import i18n from '../i18n'
import { AppProvider } from '../state'

vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false }) as Response))

function renderApp(hash = '#/') {
  window.location.hash = hash
  return render(
    <AppProvider>
      <App />
    </AppProvider>,
  )
}

beforeEach(async () => {
  localStorage.clear()
  window.location.hash = ''
  document.documentElement.classList.remove('dark')
  await i18n.changeLanguage('en')
})

describe('Home', () => {
  it('shows one tile per category and the effectivity badge', () => {
    renderApp()
    for (const c of ['jeepney', 'uv', 'bus-city', 'bus-provincial', 'busway', 'taxi', 'tnvs']) {
      expect(screen.getByTestId(`tile-${c}`)).toBeInTheDocument()
    }
    expect(screen.getByText(/Effective .*2026.*LTFRB/)).toBeInTheDocument()
  })
})

describe('Jeepney calculator', () => {
  it('user story 1: traditional jeep, 12 km -> ₱30.00 regular / ₱24.00 discounted', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/jeepney')
    const km = screen.getByLabelText('Distance (km)')
    await user.clear(km)
    await user.type(km, '12')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱30.00')
    expect(screen.getByTestId('fare-secondary')).toHaveTextContent('₱24.00')
    expect(screen.getByTestId('fare-old')).toHaveTextContent('₱27.50')
    expect(screen.getByTestId('fare-old')).toHaveTextContent('+₱2.50 (+9.1%)')
  })

  it('user story 2: discount toggle sticks and shows discounted fare first', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp('#/calc/jeepney')
    await user.click(screen.getByRole('switch'))
    const km = screen.getByLabelText('Distance (km)')
    await user.clear(km)
    await user.type(km, '12')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱24.00')
    unmount()
    renderApp('#/calc/jeepney')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('switches to modern jeep and flags distances beyond the table', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/jeepney')
    await user.click(screen.getByRole('radio', { name: /Modern/ }))
    const km = screen.getByLabelText('Distance (km)')
    await user.clear(km)
    await user.type(km, '10')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱31.50')
    await user.clear(km)
    await user.type(km, '55')
    expect(screen.getByRole('status')).toHaveTextContent(/beyond published table/i)
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱139.50')
  })

  it('rejects zero distance and rounds partial km up', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/jeepney')
    const km = screen.getByLabelText('Distance (km)')
    await user.clear(km)
    expect(screen.getByRole('alert')).toHaveTextContent(/greater than 0/)
    await user.type(km, '4.2')
    expect(screen.getByText('Charged as 5 km')).toBeInTheDocument()
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱16.00')
  })
})

describe('EDSA Busway', () => {
  it('user story 3: pick direction and stations, no distance typed', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/busway')
    await user.selectOptions(screen.getByLabelText('From'), 'Monumento')
    const to = screen.getByLabelText('To')
    expect(within(to).queryByRole('option', { name: 'Monumento' })).toBeNull()
    await user.selectOptions(to, 'Ayala')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱58.25')
    expect(screen.getByTestId('fare-secondary')).toHaveTextContent('₱46.50')
  })
  it('infers the direction from the stations: PITX → City of Dreams is northbound', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/busway')
    expect(screen.queryByRole('radio', { name: 'Northbound' })).toBeNull()
    await user.selectOptions(screen.getByLabelText('From'), 'PITX')
    await user.selectOptions(screen.getByLabelText('To'), 'City of Dreams')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱18.00')
    expect(screen.getByText('Direction: Northbound')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('From'), 'Ayala')
    await user.selectOptions(screen.getByLabelText('To'), 'Monumento')
    expect(screen.getByText('Direction: Northbound')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('To'), 'PITX')
    expect(screen.getByText('Direction: Southbound')).toBeInTheDocument()
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱29.75')
    // Numbered route strip with notes and map links for the chosen stops
    const strip = screen.getByTestId('route-strip')
    expect(within(strip).getAllByRole('listitem')).toHaveLength(24)
    expect(within(strip).getByText('Southbound boarding lane inside One Ayala Mall.')).toBeInTheDocument()
    expect(within(strip).getAllByRole('link', { name: /Open in Maps/ })).toHaveLength(2)
  })
})

describe('Taxi and TNVS', () => {
  it('user story 4: taxi breakdown', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/taxi')
    const km = screen.getByLabelText('Distance (km)')
    await user.clear(km)
    await user.type(km, '10')
    const min = screen.getByLabelText('Travel time (min)')
    await user.clear(min)
    await user.type(min, '20')
    const b = screen.getByTestId('breakdown')
    expect(b).toHaveTextContent('Flag-down₱65.00')
    expect(b).toHaveTextContent('Distance₱135.00')
    expect(b).toHaveTextContent('Time₱40.00')
    expect(b).toHaveTextContent('Total₱240.00')
    expect(screen.getByTestId('fare-secondary')).toHaveTextContent('₱192.00')
  })
  it('airport taxi uses metres and steps', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/taxi')
    await user.click(screen.getByRole('radio', { name: /Airport/ }))
    const m = screen.getByLabelText('Distance (m)')
    await user.clear(m)
    await user.type(m, '500')
    const min = screen.getByLabelText('Travel time (min)')
    await user.clear(min)
    await user.type(min, '0')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱115.00')
  })
  it('tnvs adds a floored pick-up charge and a surge note', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/tnvs')
    await user.click(screen.getByRole('radio', { name: 'Sedan' }))
    const km = screen.getByLabelText('Distance (km)')
    await user.clear(km)
    await user.type(km, '10')
    const min = screen.getByLabelText('Travel time (min)')
    await user.clear(min)
    await user.type(min, '30')
    await user.type(screen.getByLabelText(/pick-up distance/), '2.9')
    expect(screen.getByTestId('breakdown')).toHaveTextContent('Pick-up₱30.00')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱305.00')
    expect(screen.getByText(/surge/)).toBeInTheDocument()
  })
})

describe('Compare, tables, about, language', () => {
  it('compare lists distance modes cheapest first', () => {
    renderApp('#/compare')
    const items = within(screen.getByTestId('compare-list')).getAllByRole('listitem')
    expect(items.length).toBe(11)
    expect(items[0]).toHaveTextContent('Provincial Bus · Ordinary') // 10 km: 12 + 5 × 2.20
    expect(items[0]).toHaveTextContent('₱23.00')
  })
  it('fare tables render the published rows', () => {
    renderApp('#/tables')
    const rows = within(screen.getByTestId('km-table')).getAllByRole('row')
    expect(rows.length).toBe(52) // 2 header rows + 50 km
    expect(rows[2]).toHaveTextContent('₱14.00')
  })
  it('about shows the hotline and switching language translates the UI', async () => {
    const user = userEvent.setup()
    renderApp('#/about')
    expect(screen.getByRole('link', { name: /1342/ })).toHaveAttribute('href', 'tel:1342')
    await user.click(screen.getByRole('radio', { name: 'Filipino' }))
    expect(screen.getByText('Mag-ulat ng sobrang singil')).toBeInTheDocument()
    expect(localStorage.getItem('pamasahe-ph:prefs')).toContain('"lang":"fil"')
  })
  it('about shows the support card and copies the GCash number', async () => {
    const user = userEvent.setup()
    renderApp('#/about')
    const card = within(screen.getByTestId('support-card'))
    expect(card.getByRole('link', { name: 'Save QR' })).toHaveAttribute('download')
    await user.click(card.getByRole('button', { name: 'Copy number' }))
    expect(card.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    const shown = card.getByTestId('gcash-number').textContent ?? ''
    expect(await navigator.clipboard.readText()).toBe(shown.replace(/\s/g, ''))
  })
})

describe('Appearance and install', () => {
  it('cycles light → dark → system from the top bar and persists', async () => {
    const user = userEvent.setup()
    renderApp('#/about')
    await user.click(screen.getByRole('radio', { name: 'Light' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await user.click(screen.getByTestId('theme-toggle'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('pamasahe-ph:prefs')).toContain('"theme":"dark"')
    await user.click(screen.getByTestId('theme-toggle'))
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
  })
  it('shows the download card with instructions when no install prompt is available', async () => {
    const user = userEvent.setup()
    renderApp('#/')
    const card = screen.getByTestId('install-card')
    await user.click(within(card).getByRole('button', { name: 'Download app' }))
    expect(within(card).getByRole('status')).toHaveTextContent(/Install app/)
    await user.click(within(card).getByRole('button', { name: 'Not now' }))
    expect(screen.queryByTestId('install-card')).toBeNull()
  })
})

describe('Pin on map', () => {
  it('opens the route picker from the jeepney calculator and closes it', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/jeepney')
    await user.click(screen.getByTestId('map-open'))
    const picker = screen.getByTestId('route-picker')
    expect(within(picker).getByText(/Tap the map where you will get on/)).toBeInTheDocument()
    await user.click(within(picker).getByRole('button', { name: 'Close' }))
    expect(screen.queryByTestId('route-picker')).toBeNull()
    expect(screen.getByTestId('map-open')).toBeInTheDocument()
  })
})
