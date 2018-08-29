function statePart() {
  return Math.random().toString(36).substring(7)
}

function generateState() {
  return statePart() + statePart() + statePart() + statePart();
}


export default {
  generateState
}
