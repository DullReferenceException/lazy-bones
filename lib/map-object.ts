export default function mapObject(obj, fn) {
  return Object
    .keys(obj)
    .reduce((result, key) => Object.assign(result, { [key]: fn(key) }), {});
}
