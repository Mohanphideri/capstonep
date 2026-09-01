import Icon from './Icon.jsx';

const map = { fleet: 'bus', price: 'tag', shield: 'shield', clock: 'clock', support: 'message' };
export function BenefitIcon({ kind, className = "" }) {
  return <Icon name={map[kind] || 'bus'} size={32} className={className} strokeWidth={1.8}/>;
}
