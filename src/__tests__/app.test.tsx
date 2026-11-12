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
    expect(screen.getByTestId('fare-basis')).toHaveTextContent('Distance-based fare')
    // Old-versus-new fares live in the calculation details, not next to the fare.
    expect(screen.queryByTestId('fare-old')).toBeNull()
    await user.click(screen.getByTestId('fare-details-toggle'))
    expect(screen.getByTestId('fare-details')).toHaveTextContent('₱14.00 for the first 4 km')
    expect(screen.getByTestId('fare-details')).toHaveTextContent('12 km · entered by you')
    expect(screen.getByTestId('fare-source')).toHaveTextContent('LTFRB · Traditional PUJ.pdf · effective Sep 28, 2026')
    expect(screen.getByTestId('fare-old')).toHaveTextContent('₱27.50')
    expect(screen.getByTestId('fare-old')).toHaveTextContent('+₱2.50 (+9.1%)')
  })

  it('user story 2: passenger type sticks and shows the discounted fare first', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp('#/calc/jeepney')
    await user.click(screen.getByRole('radio', { name: 'Senior citizen' }))
    const km = screen.getByLabelText('Distance (km)')
    await user.clear(km)
    await user.type(km, '12')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱24.00')
    expect(screen.getByTestId('fare-passenger')).toHaveTextContent('Senior citizen')
    unmount()
    const again = renderApp('#/calc/jeepney')
    expect(screen.getByRole('radio', { name: 'Senior citizen' })).toHaveAttribute('aria-checked', 'true')
    // Older installs stored only the on/off switch; they keep a discount.
    again.unmount()
    localStorage.setItem('pamasahe-ph:prefs', JSON.stringify({ discount: true }))
    renderApp('#/calc/jeepney')
    expect(screen.getByRole('radio', { name: 'Student' })).toHaveAttribute('aria-checked', 'true')
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
    expect(screen.getByText('4.2 km is rounded up to 5 km for the fare.')).toBeInTheDocument()
    await user.clear(km)
    await user.type(km, '1')
    // A short ride explains the minimum-fare bracket, not just "charged as 1 km".
    expect(screen.getByText('1 km is within the minimum fare, which covers the first 4 km.')).toBeInTheDocument()
    await user.clear(km)
    await user.type(km, '4.2')
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
    expect(screen.getByTestId('fare-basis')).toHaveTextContent('Estimate')
    await user.click(screen.getByTestId('fare-details-toggle'))
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
  it('keeps the same trip when switching between airport (metres) and regular taxi (km)', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/taxi')
    await user.click(screen.getByRole('radio', { name: /Airport/ }))
    const m = screen.getByLabelText('Distance (m)')
    await user.clear(m)
    await user.type(m, '1300')
    await user.click(screen.getByRole('radio', { name: 'Regular Taxi' }))
    expect(screen.getByLabelText('Distance (km)')).toHaveValue(1.3)
    // 65 + 1.3 × 13.50 + 10 min × 2 = 102.55
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱102.55')
    await user.click(screen.getByRole('radio', { name: /Airport/ }))
    expect(screen.getByLabelText('Distance (m)')).toHaveValue(1300)
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
    await user.click(screen.getByTestId('fare-details-toggle'))
    expect(screen.getByTestId('breakdown')).toHaveTextContent('Pick-up₱30.00')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱305.00')
    expect(screen.getAllByText(/surge/).length).toBeGreaterThan(0)
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
    expect(within(picker).getByLabelText('Where will you get on?')).toBeInTheDocument()
    expect(within(picker).getByLabelText('Where will you get off?')).toBeInTheDocument()
    await user.click(within(picker).getByRole('button', { name: 'Close' }))
    expect(screen.queryByTestId('route-picker')).toBeNull()
    expect(screen.getByTestId('map-open')).toBeInTheDocument()
  })
})

describe('Train (MRT/LRT)', () => {
  it('LRT-2 Antipolo → Recto: single journey ₱18 (was ₱35), Beep ₱16.50, any order', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/rail')
    await user.click(screen.getByRole('radio', { name: 'LRT-2' }))
    await user.selectOptions(screen.getByLabelText('From'), 'Antipolo')
    await user.selectOptions(screen.getByLabelText('To'), 'Recto')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱18.00')
    expect(screen.getByTestId('fare-basis')).toHaveTextContent('Published station fare')
    await user.click(screen.getByTestId('fare-details-toggle'))
    expect(screen.getByTestId('fare-old')).toHaveTextContent('₱35.00')
    await user.click(screen.getByRole('radio', { name: /Beep/ }))
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱16.50')
    expect(screen.getByTestId('fare-source')).toHaveTextContent('LRTA · LRTA fare matrix (2026) · effective Mar 23, 2026')
  })
  it('LRT-1 Dr. Santos → Fernando Poe Jr.: single journey ₱55, Beep ₱52', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/rail')
    await user.click(screen.getByRole('radio', { name: 'LRT-1' }))
    await user.selectOptions(screen.getByLabelText('From'), 'Fernando Poe Jr.')
    await user.selectOptions(screen.getByLabelText('To'), 'Dr. Santos')
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱55.00')
    await user.click(screen.getByRole('radio', { name: /Beep/ }))
    expect(screen.getByTestId('fare-primary')).toHaveTextContent('₱52.00')
    expect(screen.getByTestId('fare-basis')).toHaveTextContent('LRMC · effective Apr 2, 2025')
  })
})

describe('Overcharge report', () => {
  it('compares the amount charged and builds a report', async () => {
    const user = userEvent.setup()
    renderApp('#/calc/taxi')
    const km = screen.getByLabelText('Distance (km)')
    await user.clear(km)
    await user.type(km, '10')
    const min = screen.getByLabelText('Travel time (min)')
    await user.clear(min)
    await user.type(min, '20')
    await user.click(screen.getByTestId('report-open'))
    await user.type(screen.getByTestId('report-charged'), '200')
    expect(screen.getByText('That is not more than the official fare.')).toBeInTheDocument()
    await user.clear(screen.getByTestId('report-charged'))
    await user.type(screen.getByTestId('report-charged'), '300')
    // A metered fare depends on the distance and time entered, so the difference is only possible.
    expect(screen.getByTestId('report-over')).toHaveTextContent('Possible fare difference: ₱60.00 (+25.0%)')
    await user.type(screen.getByTestId('report-plate'), 'abc 1234')
    const text = screen.getByTestId('report-text')
    expect(text).toHaveTextContent('Plate / body no.: ABC 1234')
    expect(text).toHaveTextContent('Official fare: ₱240.00 (Regular)')
    expect(text).toHaveTextContent('Fare basis: Estimate')
    expect(text).toHaveTextContent('Fare report (draft)')
    await user.click(screen.getByTestId('report-copy'))
    expect(screen.queryByText(/submitted\./)).toBeNull()
    expect(screen.getByRole('link', { name: /Call LTFRB 1342/ })).toHaveAttribute('href', 'tel:1342')
  })
})

describe('Multi-leg trip', () => {
  it('adds legs from different modes and totals them', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp('#/calc/jeepney')
    const km = screen.getByLabelText('Distance (km)')
    await user.clear(km)
    await user.type(km, '5')
    await user.click(screen.getByTestId('trip-add')) // ₱16.00
    expect(screen.getByTestId('trip-badge')).toHaveTextContent('1')
    unmount()
    renderApp('#/calc/rail')
    await user.click(screen.getByRole('radio', { name: 'MRT-3' }))
    await user.selectOptions(screen.getByLabelText('From'), 'North Avenue')
    await user.selectOptions(screen.getByLabelText('To'), 'Ayala')
    await user.click(screen.getByTestId('trip-add')) // ₱12.00
    expect(screen.getByTestId('trip-badge')).toHaveTextContent('2')
    window.location.hash = '#/trip'
    await screen.findByTestId('trip-screen')
    expect(screen.getAllByTestId('trip-leg')).toHaveLength(2)
    expect(screen.getByTestId('trip-total')).toHaveTextContent('₱28.00')
    // Legs keep a snapshot of the fare data they were priced with.
    expect(JSON.parse(localStorage.getItem('pamasahe-ph:trip')!)[0]).toMatchObject({
      modeId: 'puj-traditional', basis: 'distance', km: 5, inputSource: 'manual', fareVersion: '2026.09.28-1', effective: '2026-09-28', passenger: 'regular',
    })
    await user.click(screen.getByRole('button', { name: 'Move leg 1 down' }))
    expect(screen.getAllByTestId('trip-leg')[0]).toHaveTextContent('MRT-3')
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    expect(screen.getByTestId('trip-total')).toHaveTextContent('₱16.00')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByTestId('trip-total')).toHaveTextContent('₱28.00')
    // Edit the jeep leg's distance (re-priced) and duplicate it.
    await user.click(screen.getByTestId('trip-edit'))
    await user.clear(screen.getByTestId('trip-edit-km'))
    await user.type(screen.getByTestId('trip-edit-km'), '12')
    await user.click(screen.getByTestId('trip-edit-save'))
    expect(screen.getByTestId('trip-total')).toHaveTextContent('₱42.00')
    await user.click(screen.getAllByTestId('trip-duplicate')[1])
    expect(screen.getAllByTestId('trip-leg')).toHaveLength(3)
    expect(screen.getByTestId('trip-total')).toHaveTextContent('₱72.00')
  })
})

describe('Privacy policy', () => {
  it('is linked from About and shows the sections in the chosen language', async () => {
    const user = userEvent.setup()
    renderApp('#/about')
    expect(screen.getByTestId('privacy-link')).toHaveAttribute('href', '#/privacy')
    window.location.hash = '#/privacy'
    await screen.findByTestId('privacy')
    expect(screen.getByRole('heading', { name: 'Location' })).toBeInTheDocument()
    expect(screen.getByText(/router\.project-osrm\.org/)).toBeInTheDocument()
    expect(screen.getByText(/Republic Act No\. 10173/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Language' }))
    expect(screen.getByRole('heading', { name: 'Lokasyon' })).toBeInTheDocument()
  })
})

describe('Navigation and Home search (Release 1)', () => {
  it('has Home, Routes, Fares, My Trip and More; a calculator activates Fares', async () => {
    renderApp('#/calc/jeepney')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const name of ['Home', 'Routes', 'Fares', 'My Trip', 'More']) expect(within(nav).getByRole('link', { name: new RegExp(name) })).toBeInTheDocument()
    expect(screen.getByTestId('nav-fares')).toHaveAttribute('aria-current', 'page')
    window.location.hash = '#/compare'
    await screen.findByText('Compare modes')
    expect(screen.getByTestId('nav-more')).toHaveAttribute('aria-current', 'page')
  })

  it('Fares hub labels what each amount means', () => {
    renderApp('#/fares')
    expect(screen.getByTestId('tile-basis-jeepney')).toHaveTextContent('Minimum fare')
    expect(screen.getByTestId('tile-basis-taxi')).toHaveTextContent('Flag-down')
    expect(screen.getByTestId('tile-basis-rail')).toHaveTextContent('Station matrix')
    expect(screen.getByRole('link', { name: /Fare tables/ })).toHaveAttribute('href', '#/tables')
  })

  it('More lists secondary screens and settings', () => {
    renderApp('#/more')
    for (const id of ['compare', 'tables', 'support', 'about', 'privacy']) expect(screen.getByTestId(`more-${id}`)).toHaveAttribute('href', `#/${id}`)
    expect(screen.getByTestId('more-clear-trip')).toBeDisabled()
  })

  it('origin and destination open their own pickers and keep each other', async () => {
    const user = userEvent.setup()
    renderApp('#/')
    expect(screen.getByTestId('hero-still')).toBeInTheDocument()
    await user.click(screen.getByTestId('home-from'))
    expect(screen.getByRole('dialog', { name: 'Where will you get on?' })).toBeInTheDocument()
    expect(screen.queryByTestId('sheet-pin')).toBeNull()
    await user.type(screen.getByTestId('sheet-input'), 'Ayala')
    await user.click(screen.getAllByTestId('sheet-place').find((b) => /Ayala \(MRT-3\)/.test(b.textContent ?? ''))!)
    expect(screen.getByTestId('home-from')).toHaveTextContent('Ayala (MRT-3)')
    await user.click(screen.getByTestId('home-to'))
    expect(screen.getByRole('dialog', { name: 'Where will you get off?' })).toBeInTheDocument()
    await user.type(screen.getByTestId('sheet-input'), 'North Ave')
    await user.click(screen.getAllByTestId('sheet-place')[0])
    expect(screen.getByTestId('home-from')).toHaveTextContent('Ayala (MRT-3)')
    expect(screen.getByTestId('home-to')).toHaveTextContent('North Ave')
    expect(screen.getByTestId('plan-open').getAttribute('href')).toMatch(/^#\/plan\/14\.\d+,121\.\d+\/14\.\d+,121\.\d+$/)
  })
})

describe('Fare tiles', () => {
  it('basis label and amount describe the same mode', () => {
    renderApp('#/fares')
    expect(screen.getByTestId('tile-basis-bus-provincial')).toHaveTextContent('Per-km rate')
    expect(screen.getByTestId('tile-rate-bus-provincial')).toHaveTextContent('per km')
  })
})
