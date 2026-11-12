/** Privacy policy text. Keep it in sync with what the app actually does:
 *  storage keys in src/lib (prefs, trip, ride, updater), third-party calls in
 *  src/lib/routing.ts, src/lib/geocode.ts, src/components/RouteMap.tsx and
 *  src/components/Analytics.tsx. */
import type { Lang } from '../engine/types'

export const PRIVACY_EFFECTIVE = '2026-11-12'
export const PRIVACY_CONTACT = 'https://github.com/Engrdyg/Pamasahe-PH/issues'

export interface PrivacySection {
  title: string
  body: string[]
}

export const privacy: Record<Lang, { intro: string; sections: PrivacySection[] }> = {
  en: {
    intro:
      'Bayad Po is a free fare checker. It has no accounts, no ads and no server of its own that stores personal data. This page explains what the app keeps on your device, what it sends to other services when you use certain features, and your choices.',
    sections: [
      {
        title: 'What stays on your device',
        body: [
          'Your settings (language, appearance, passenger type, route sorting, last mode used) and fare data (plus the previous fare data set after an update) are saved in your browser storage so the app works offline.',
          'Trips you build with "Add to trip", a ride in progress in the ride tracker, the places you save or recently picked, and saved commutes are also saved in your browser storage. A guided trip in progress is kept only for the current browser session.',
          'This data never leaves your device unless you share it yourself. Clearing the site data in your browser, or "Clear trip", "Discard", the ✕ on a saved commute and More → "Clear saved and recent places" in the app, deletes it.',
        ],
      },
      {
        title: 'Location',
        body: [
          'The app asks for your location only when you choose your current location as a start or end, start the ride tracker, or turn on GPS in a guided trip. You can refuse; typing a distance or picking stations still works.',
          'Ride tracker and guided trip: GPS positions are processed on your device to measure distance, pick the nearest station or show the distance to your stop. They are not sent to us.',
          'Trip planner: to estimate road distance and time, the start and end coordinates you choose are sent to the OSRM routing service (router.project-osrm.org).',
        ],
      },
      {
        title: 'Third-party services used by some features',
        body: [
          'Place search: the text you type in "Where will you get on / off?" is sent to Photon by komoot (photon.komoot.io), an OpenStreetMap-based search. In the route planner, the coordinates of the stops where you get on and off are also sent to Photon to name the nearest landmark or street.',
          'Maps: map images are loaded from OpenStreetMap (tile.openstreetmap.org), which can tell that server which area you are viewing.',
          'Hosting and analytics: the app is hosted on Vercel. Vercel Web Analytics counts page views per screen (for example "/calc/jeepney") without cookies and without identifying you. Route-planner pages are counted only as "/plan": the places and coordinates you search are never sent to analytics. Like any website host, Vercel receives standard request data such as your IP address.',
          'These services have their own privacy policies. We do not sell or share data with anyone else.',
        ],
      },
      {
        title: 'Route-problem feedback',
        body: [
          '"Report a route problem" opens a prefilled issue on the project\'s public GitHub page in your browser. Nothing is sent unless you submit it there, and what you submit is public. Your approximate get-on spot (rounded to about 100 m) is included only if you tick that option. Reports are reviewed before any route data changes.',
        ],
      },
      {
        title: 'Overcharge reports and sharing',
        body: [
          'A fare report draft, a shared fare or a shared trip is created on your device. It is sent only where you choose (a call to the LTFRB 1342 hotline, a message app, email). Plate numbers and notes you type are not stored by the app.',
        ],
      },
      {
        title: 'Donations',
        body: [
          '"Open GCash" only opens the GCash app or its store page, and "Save QR" downloads an image. The app does not process payments or see any transaction.',
        ],
      },
      {
        title: 'Children',
        body: ['The app does not knowingly collect personal information from anyone, including children.'],
      },
      {
        title: 'Your rights',
        body: [
          'Under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) you may ask about, correct or object to the processing of your personal data. Because the app keeps your data on your device, you can review and delete it yourself at any time.',
        ],
      },
      {
        title: 'Changes and contact',
        body: [
          'If this policy changes, the new version and its effective date will appear on this page.',
          'Questions or requests: open an issue at github.com/Engrdyg/Pamasahe-PH/issues.',
        ],
      },
    ],
  },
  fil: {
    intro:
      'Libreng tagasuri ng pamasahe ang Bayad Po. Walang account, walang ads, at walang sariling server na nag-iimbak ng personal na datos. Ipinapaliwanag dito kung ano ang naiiwan sa device mo, ano ang ipinapadala sa ibang serbisyo kapag ginamit mo ang ilang feature, at ang mga pagpipilian mo.',
    sections: [
      {
        title: 'Ano ang naiiwan sa device mo',
        body: [
          'Ang settings mo (wika, itsura, uri ng pasahero, pag-ayos ng ruta, huling mode) at ang fare data (pati ang naunang fare data pagkatapos ng update) ay naka-save sa browser storage para gumana ang app kahit offline.',
          'Ang mga biyahe sa "Idagdag sa biyahe", ang tumatakbong ride sa ride tracker, ang mga lugar na sinave mo o kamakailang pinili, at ang mga saved commute ay naka-save din sa browser storage. Ang guided trip na ginagamit ay nasa kasalukuyang browser session lang.',
          'Hindi ito lumalabas sa device mo maliban kung ikaw mismo ang mag-share. Mabubura ito kapag nilinis mo ang site data sa browser, o sa "Burahin ang biyahe", "Burahin" at Iba pa → "Burahin ang saved at recent na lugar" sa app.',
        ],
      },
      {
        title: 'Lokasyon',
        body: [
          'Hihingi lang ang app ng lokasyon kapag pinili mo ang kasalukuyang lokasyon bilang simula o dulo, sinimulan ang ride tracker, o binuksan ang GPS sa guided trip. Pwede kang tumanggi; gumagana pa rin ang pag-type ng distansya o pagpili ng istasyon.',
          'Ride tracker: sa device mo pinoproseso ang GPS para sukatin ang distansya at piliin ang pinakamalapit na istasyon. Hindi ito ipinapadala sa amin.',
          'Trip planner: para matantiya ang distansya at oras sa kalsada, ipinapadala ang napili mong simula at dulo sa OSRM routing service (router.project-osrm.org).',
        ],
      },
      {
        title: 'Mga third-party na serbisyo ng ilang feature',
        body: [
          'Paghahanap ng lugar: ipinapadala ang tina-type mo sa "Saan ka sasakay / bababa?" sa Photon ng komoot (photon.komoot.io), isang search na batay sa OpenStreetMap. Sa route planner, ipinapadala rin sa Photon ang coordinates ng mga sakayan at babaan para mapangalanan ang pinakamalapit na landmark o kalye.',
          'Mapa: kinukuha ang mga larawan ng mapa mula sa OpenStreetMap (tile.openstreetmap.org), kaya malalaman ng server na iyon kung anong lugar ang tinitingnan mo.',
          'Hosting at analytics: naka-host ang app sa Vercel. Binibilang ng Vercel Web Analytics ang page views bawat screen (hal. "/calc/jeepney") nang walang cookies at hindi ka kinikilala. "/plan" lang ang binibilang sa route planner: hindi kailanman ipinapadala sa analytics ang mga lugar at coordinates na hinahanap mo. Gaya ng ibang website host, natatanggap ng Vercel ang karaniwang request data tulad ng IP address mo.',
          'May sariling privacy policy ang mga serbisyong ito. Hindi namin ibinebenta o ibinabahagi ang datos sa iba.',
        ],
      },
      {
        title: 'Feedback sa ruta',
        body: [
          'Ang "I-report ang problema sa ruta" ay nagbubukas ng naka-fill na issue sa public GitHub page ng proyekto sa browser mo. Walang ipapadala hangga\'t hindi mo sinusumite doon, at public ang isusumite mo. Kasama lang ang tantiyang sakayan (mga 100 m) kung lalagyan mo ng check. Sinusuri ang mga report bago baguhin ang route data.',
        ],
      },
      {
        title: 'Overcharge report at pag-share',
        body: [
          'Sa device mo ginagawa ang overcharge report, shared fare, o shared trip. Ipinapadala lang ito kung saan mo piliin (tawag sa LTFRB 1342, messaging app, email). Hindi iniimbak ng app ang plate number at notes na tina-type mo.',
        ],
      },
      {
        title: 'Donasyon',
        body: [
          'Binubuksan lang ng "Buksan ang GCash" ang GCash app o ang store page nito, at nagda-download lang ng larawan ang "I-save ang QR". Hindi nagpoproseso ng bayad ang app at hindi nito nakikita ang transaksyon.',
        ],
      },
      {
        title: 'Mga bata',
        body: ['Hindi sinasadyang nangongolekta ang app ng personal na impormasyon mula kaninuman, kasama ang mga bata.'],
      },
      {
        title: 'Mga karapatan mo',
        body: [
          'Sa ilalim ng Data Privacy Act of 2012 (Republic Act No. 10173), maaari kang magtanong, magpatama, o tumutol sa pagproseso ng personal mong datos. Dahil nasa device mo ang datos, ikaw mismo ang makakatingin at makakabura nito anumang oras.',
        ],
      },
      {
        title: 'Pagbabago at contact',
        body: [
          'Kung magbago ang policy na ito, makikita rito ang bagong bersyon at ang petsa ng bisa nito.',
          'Mga tanong o kahilingan: magbukas ng issue sa github.com/Engrdyg/Pamasahe-PH/issues.',
        ],
      },
    ],
  },
}
