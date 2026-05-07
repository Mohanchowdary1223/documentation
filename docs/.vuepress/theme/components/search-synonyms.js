import get from 'lodash/get'

const DEFAULT_SYNONYM_GROUPS = [
  ['search', 'lookup', 'find', 'query'],
  ['transfer', 'payment', 'transaction', 'remittance'],
  ['settlement', 'settle', 'reconciliation', 'reconcile'],
  ['participant', 'member', 'party', 'counterparty'],
  ['onboarding', 'registration', 'enrollment', 'enrolment', 'setup'],
  ['guide', 'guideline', 'manual', 'documentation'],
  ['issue', 'problem', 'error', 'bug'],
  ['api', 'endpoint', 'interface'],
  ['security', 'cybersecurity', 'safety'],
  ['hub', 'scheme', 'platform']
]

const normalizeWord = word => String(word || '').trim().toLowerCase()

const uniqueWords = words => Array.from(new Set(words.map(normalizeWord).filter(Boolean)))

const buildSearchDomain = (page, additionalStr = null) => {
  let domain = get(page, 'title', '')

  if (get(page, 'frontmatter.tags')) {
    domain += ` ${page.frontmatter.tags.join(' ')}`
  }

  if (get(page, 'frontmatter.description')) {
    domain += ` ${page.frontmatter.description}`
  }

  if (get(page, 'excerpt')) {
    domain += ` ${page.excerpt}`
  }

  if (get(page, 'path')) {
    domain += ` ${page.path}`
  }

  if (get(page, 'regularPath')) {
    domain += ` ${page.regularPath}`
  }

  if (get(page, '_content')) {
    domain += ` ${page._content}`
  }

  if (get(page, 'content')) {
    domain += ` ${page.content}`
  }

  if (additionalStr) {
    domain += ` ${additionalStr}`
  }

  return domain
}

export const normalizeSynonymGroups = (synonymConfig) => {
  if (!synonymConfig) {
    return DEFAULT_SYNONYM_GROUPS
  }

  if (Array.isArray(synonymConfig)) {
    return synonymConfig
      .map(group => uniqueWords(Array.isArray(group) ? group : [group]))
      .filter(group => group.length > 1)
  }

  if (typeof synonymConfig === 'object') {
    return Object.entries(synonymConfig)
      .map(([key, value]) => uniqueWords([key].concat(Array.isArray(value) ? value : [value])))
      .filter(group => group.length > 1)
  }

  return DEFAULT_SYNONYM_GROUPS
}

const escapeRegExp = str => str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

const matchTest = (query, domain) => {
  // eslint-disable-next-line no-control-regex
  const nonASCIIRegExp = new RegExp('[^\x00-\x7F]')

  const words = query
    .split(/\s+/g)
    .map(str => str.trim())
    .filter(Boolean)

  if (!nonASCIIRegExp.test(query)) {
    const hasTrailingSpace = query.endsWith(' ')
    const searchRegex = new RegExp(
      words
        .map((word, index) => {
          if (words.length === index + 1 && !hasTrailingSpace) {
            return `(?=.*\\b${escapeRegExp(word)})`
          }

          return `(?=.*\\b${escapeRegExp(word)}\\b)`
        })
        .join('') + '.+',
      'gi'
    )
    return searchRegex.test(domain)
  }

  return words.some(word => domain.toLowerCase().indexOf(word) > -1)
}

const buildQueryVariants = (query, synonymGroups) => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return []
  }

  const groups = normalizeSynonymGroups(synonymGroups)
  const words = normalizedQuery.split(/\s+/g).filter(Boolean)
  const variantOptions = words.map(word => {
    const group = groups.find(synonyms => synonyms.includes(word))

    if (!group) {
      return [word]
    }

    return uniqueWords([word].concat(group))
  })

  const variants = new Set()
  const MAX_VARIANTS = 12

  const buildVariants = (index, currentWords) => {
    if (variants.size >= MAX_VARIANTS) {
      return
    }

    if (index === variantOptions.length) {
      const variant = currentWords.join(' ').trim()

      if (variant) {
        variants.add(variant)
      }

      return
    }

    variantOptions[index].forEach(option => {
      buildVariants(index + 1, currentWords.concat(option))
    })
  }

  buildVariants(0, [])

  return Array.from(variants).slice(0, MAX_VARIANTS)
}

export const getQueryVariants = (query, synonymConfig = null) => buildQueryVariants(query, synonymConfig)

export const getMatchingSynonymVariants = (query, page, additionalStr = null, synonymConfig = null) => {
  const domain = buildSearchDomain(page, additionalStr)
  return buildQueryVariants(query, synonymConfig).filter(variant => matchTest(variant, domain))
}

export const matchesQueryWithSynonyms = (query, page, additionalStr = null, synonymConfig = null) => {
  return getMatchingSynonymVariants(query, page, additionalStr, synonymConfig).length > 0
}