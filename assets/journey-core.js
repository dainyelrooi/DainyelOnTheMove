/* Pure shared rules. No storage, network, device location or private content. */
export function calendarDay(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date(instant));
  const part = name => parts.find(p => p.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function tripState(trip, now = Date.now()) {
  const planned = Date.parse(trip.departureAt);
  const actual = Date.parse(trip.confirmedDepartureAt || '');
  const end = Date.parse(trip.endedAt || '');
  const zone = trip.timeZone || 'Europe/Amsterdam';
  const remaining = Math.max(0, planned - now);
  const days = Math.floor(Math.floor(remaining / 1000) / 86400);
  if (Number.isFinite(actual) && actual <= now) {
    const last=Number.isFinite(end)&&end<=now?end:now;
    const day = Math.floor((Date.parse(calendarDay(last, zone)) - Date.parse(calendarDay(actual, zone))) / 86400000) + 1;
    if (Number.isFinite(end) && end <= now) return {phase:'completed', label:'Journey completed', remaining:0, day};
    return {phase:'travelling', label:`On the move · day ${day}`, remaining:0, day};
  }
  return {phase:remaining > 0 ? 'planned' : 'awaiting-confirmation', remaining, day:null,
    label:remaining <= 0 ? 'Departure update soon' : days ? `Departing in ${days} ${days === 1 ? 'day' : 'days'}` : 'Departing in <1 day'};
}
export const currencyDigits = currency => new Intl.NumberFormat('en', {style:'currency', currency}).resolvedOptions().maximumFractionDigits;
export function parseMinor(value,currency){
  const digits=currencyDigits(currency),normalized=String(value).trim().replace(',','.');
  if(!/^\d+(?:\.\d+)?$/.test(normalized))throw new TypeError('Enter a positive amount without thousands separators.');
  const [whole,fraction='']=normalized.split('.');if(fraction.length>digits)throw new TypeError('Too many decimal places for this currency.');
  const amount=BigInt(whole)*10n**BigInt(digits)+BigInt(fraction.padEnd(digits,'0')||'0');
  if(amount>100000000000n)throw new RangeError('Amount is too large.');return Number(amount);
}
export function money(minor, currency) {
  if (!Number.isSafeInteger(minor)) throw new TypeError('Money must use integer minor units');
  return new Intl.NumberFormat('en-GB', {style:'currency', currency}).format(minor / 10 ** currencyDigits(currency));
}
export function costSummary(records) {
  const totals = new Map();
  for (const item of records) {
    if (!Number.isSafeInteger(item.amountMinor) || !Number.isSafeInteger(item.personalMinor) || item.personalMinor < 0 || item.personalMinor > item.amountMinor || item.amountMinor > 100000000000 || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(Date.parse(item.date)) || new Date(item.date).toISOString().slice(0,10)!==item.date || !/^[A-Z]{3}$/.test(item.currency)) throw new TypeError('Invalid expense record');
    currencyDigits(item.currency);
    const total = totals.get(item.currency) || {currency:item.currency, totalMinor:0, personalMinor:0, categories:Object.create(null), dates:[]};
    total.totalMinor += item.amountMinor; total.personalMinor += item.personalMinor;
    if (!Number.isSafeInteger(total.totalMinor) || !Number.isSafeInteger(total.personalMinor)) throw new RangeError('Amount overflow');
    total.categories[item.category] = (total.categories[item.category] || 0) + item.personalMinor;
    total.dates.push(item.date); totals.set(item.currency, total);
  }
  return [...totals.values()].map(total => {
    const dates = total.dates.sort(), start = dates[0], end = dates.at(-1);
    const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
    return {...total, start, end, days, averageMinor:Math.round(total.personalMinor / days), recordedDays:new Set(dates).size};
  });
}
export function safeLocalUrl(value) {
  return typeof value === 'string' && /^(?:\/?[a-z0-9-]+(?:\.html)?|\/?)(?:#[a-zA-Z0-9-]+)?$/.test(value) && !value.includes('//');
}
export function archiveMoments(model) {
  const moments = [];
  for (const d of model.destinations) for (const year of new Set(d.years)) moments.push({id:`${d.id}-${year}`, destinationId:d.id, year, title:d.name, label:d.tripDetails, kind:'visit', url:d.storyHref || '/atlas', tripId:`archive-${year}`});
  for (const story of model.stories) moments.push({...story, kind:story.complete ? 'story' : 'preview'});
  for (const note of model.journal.filter(n => n.status === 'published')) moments.push({...note, year:note.eventYear, kind:'journal'});
  return moments.sort((a,b) => a.year - b.year || a.id.localeCompare(b.id));
}
export function filterMoments(moments, {year='', trip='', kind=''} = {}) {
  return moments.filter(m => (!year || String(m.year) === year) && (!trip || m.tripId === trip) && (!kind || m.kind === kind));
}
