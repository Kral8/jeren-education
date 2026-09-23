import { COUNTRIES } from '../data/geography.js';
import { getCurrentLang } from '../i18n/index.js';

export function localizedName(item) {
  if (!item?.name) return '';
  const lang = getCurrentLang();
  return item.name[lang] || item.name.ru || '';
}

export function getCountries() {
  return COUNTRIES;
}

export function getCountryById(countryId) {
  return COUNTRIES.find((c) => c.id === countryId) || null;
}

export function getRegions(countryId) {
  const country = getCountryById(countryId);
  return country?.regions || [];
}

export function getCities(countryId, regionId) {
  const region = getRegions(countryId).find((r) => r.id === regionId);
  return region?.cities || [];
}

export function getInstitutions(countryId, regionId, cityId) {
  const city = getCities(countryId, regionId).find((c) => c.id === cityId);
  return city?.institutions || [];
}

export function formatPhone(countryId, nationalNumber) {
  const country = getCountryById(countryId);
  if (!country) return nationalNumber;
  const digits = String(nationalNumber || '').replace(/\D/g, '');
  return `${country.dialCode}${digits}`;
}

export function validatePhone(countryId, nationalNumber) {
  const country = getCountryById(countryId);
  if (!country) return false;
  const digits = String(nationalNumber || '').replace(/\D/g, '');
  return digits.length === country.phoneLength;
}
