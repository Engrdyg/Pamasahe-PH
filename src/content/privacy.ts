/** Privacy policy text. Keep it in sync with what the app actually does:
 *  storage keys in src/lib (prefs, trip, ride, updater), third-party calls in
 *  src/lib/routing.ts, src/lib/geocode.ts, src/components/RouteMap.tsx and
 *  src/components/Analytics.tsx. */
import type { Lang } from '../engine/types'

export const PRIVACY_EFFECTIVE = '2026-10-27'
export const PRIVACY_CONTACT = 'https://github.com/Engrdyg/Pamasahe-PH/issues'

export interface PrivacySection {
  title: string
  body: string[]
}

export const privacy: Record<Lang, { intro: string; sections: PrivacySection[] }> = {
  en: {
    intro:
      'Magkano Pamasahe is a free fare checker. It has no accounts, no ads and no server of its own that stores personal data. This page explains what the app keeps on your device, what it sends to other services when you use certain features, and your choices.',
    sections: [
      {
        title: 'What stays on your device',
        body: [
          'Your settings (language, appearance, the Student / Senior / PWD toggle, last mode used) and fare data are saved in your browser storage so the app works offline.',
          'Trips you build with "Add to trip" and a ride in progress in the ride tracker are also saved in your browser storage so they survive a reload.',
          'This data never leaves your device unless you share it yourself. Clearing the site data in your browser, or "Clear trip" and "Discard" in the app, deletes it.',
        ],
      },
      {
        title: 'Location',
        body: [
          'The app asks for your location only when you tap "Use my location" in the trip planner or start the ride tracker. You can refuse; typing a distance or picking stations still works.',
          'Ride tracker: GPS positions are processed on your device to measure distance and pick the nearest station. They are not sent to us.',
          'Trip planner: to estimate road distance and time, the start and end coordinates you choose are sent to the OSRM routing service (router.project-osrm.org).',
        ],
      },
      {
        title: 'Third-party services used by some features',
        body: [
          'Place search: the text you type in "Where will you get on / off?" is sent to Photon by komoot (photon.komoot.io), an OpenStreetMap-based search.',
          'Maps: map images are loaded from OpenStreetMap (tile.openstreetmap.org), which can tell that server which area you are viewing.',
          'Hosting and analytics: the app is hosted on Vercel. Vercel Web Analytics counts page views per screen (for example "/calc/jeepney") without cookies and without identifying you. Like any website host, Vercel receives standard request data such as your IP address.',
          'These services have their own privacy policies. We do not sell or share data with anyone else.',
        ],
      },
      {
        title: 'Overcharge reports and sharing',
        body: [
          'An overcharge report, a shared fare or a shared trip is created on your device. It is sent only where you choose (a call to the LTFRB 1342 hotline, a message app, email). Plate numbers and notes you type are not stored by the app.',
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
      'Libreng tagasuri ng pamasahe ang Magkano Pamasahe. Walang account, walang ads, at walang sariling server na nag-iimbak ng personal na datos. Ipinapaliwanag dito kung ano ang naiiwan sa device mo, ano ang ipinapadala sa ibang serbisyo kapag ginamit mo ang ilang feature, at ang mga pagpipilian mo.',
    sections: [
      {
        title: 'Ano ang naiiwan sa device mo',
        body: [
          'Ang settings mo (wika, itsura, Estudyante / Senior / PWD toggle, huling mode) at ang fare data ay naka-save sa browser storage para gumana ang app kahit offline.',
          'Ang mga biyahe sa "Idagdag sa biyahe" at ang tumatakbong ride sa ride tracker ay naka-save din sa browser storage para hindi mawala kapag na-reload.',
          'Hindi ito lumalabas sa device mo maliban kung ikaw mismo ang mag-share. Mabubura ito kapag nilinis mo ang site data sa browser, o sa "Burahin ang biyahe" at "Burahin" sa app.',
        ],
      },
      {
        title: 'Lokasyon',
        body: [
          'Hihingi lang ang app ng lokasyon kapag pinindot mo ang "Gamitin ang lokasyon ko" sa trip planner o sinimulan ang ride tracker. Pwede kang tumanggi; gumagana pa rin ang pag-type ng distansya o pagpili ng istasyon.',
          'Ride tracker: sa device mo pinoproseso ang GPS para sukatin ang distansya at piliin ang pinakamalapit na istasyon. Hindi ito ipinapadala sa amin.',
          'Trip planner: para matantiya ang distansya at oras sa kalsada, ipinapadala ang napili mong simula at dulo sa OSRM routing service (router.project-osrm.org).',
        ],
      },
      {
        title: 'Mga third-party na serbisyo ng ilang feature',
        body: [
          'Paghahanap ng lugar: ipinapadala ang tina-type mo sa "Saan ka sasakay / bababa?" sa Photon ng komoot (photon.komoot.io), isang search na batay sa OpenStreetMap.',
          'Mapa: kinukuha ang mga larawan ng mapa mula sa OpenStreetMap (tile.openstreetmap.org), kaya malalaman ng server na iyon kung anong lugar ang tinitingnan mo.',
          'Hosting at analytics: naka-host ang app sa Vercel. Binibilang ng Vercel Web Analytics ang page views bawat screen (hal. "/calc/jeepney") nang walang cookies at hindi ka kinikilala. Gaya ng ibang website host, natatanggap ng Vercel ang karaniwang request data tulad ng IP address mo.',
          'May sariling privacy policy ang mga serbisyong ito. Hindi namin ibinebenta o ibinabahagi ang datos sa iba.',
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
