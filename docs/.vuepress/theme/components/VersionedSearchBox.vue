<template>
  <div class="search-box">
    <input
      @input="query = $event.target.value"
      aria-label="Search"
      :value="query"
      :class="{ 'focused': focused }"
      autocomplete="off"
      spellcheck="false"
      @focus="focused = true"
      @blur="focused = false"
      @keyup.enter="go(focusIndex)"
      @keyup.up="onUp"
      @keyup.down="onDown"
    >
    <ul
      class="suggestions"
      v-if="showSuggestions"
      :class="{ 'align-right': alignRight }"
      @mouseleave="unfocus"
    >
      <li
        class="suggestion"
        v-for="(s, i) in suggestions"
        :class="{ focused: i === focusIndex }"
        @mousedown="go(i)"
        @mouseenter="focus(i)"
      >
        <a :href="s.path" @click.prevent>
          <span class="page-title">{{ s.title || s.path }}</span>
          <span v-if="s.header" class="header">&gt; {{ s.header.title }}</span>
        </a>
      </li>
    </ul>
  </div>
</template>

<script>
import { getMatchingSynonymVariants } from './search-synonyms'

/* global SEARCH_MAX_SUGGESTIONS, SEARCH_PATHS */
export default {
  data () {
    return {
      query: '',
      focused: false,
      focusIndex: 0
    }
  },

  computed: {
    showSuggestions () {
      return (
        this.focused &&
        this.suggestions &&
        this.suggestions.length
      )
    },

    suggestions () {
      const query = this.query.trim().toLowerCase()
      if (!query) {
        return
      }

      const { pages } = this.$site
      const localePath = this.$localePath
      const currentVersion = this.$page.version
      const directRes = []
      const synonymRes = []
      const seenKeys = new Set()

      const pushSuggestion = (collection, suggestion) => {
        const key = suggestion.path

        if (seenKeys.has(key)) {
          return
        }

        seenKeys.add(key)
        collection.push(suggestion)
      }

      const getMatches = (page, additionalStr, synonymConfig) => getMatchingSynonymVariants(
        query,
        page,
        additionalStr,
        synonymConfig
      )

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i]
        if (this.getPageLocalePath(p) !== localePath) {
          continue
        }

        if (p.version !== currentVersion) {
          continue
        }

        if (!this.isSearchable(p)) {
          continue
        }

        const directPageMatches = getMatches(p, null, [])
        const synonymPageMatches = getMatches(p, null, this.$site.themeConfig.searchSynonyms)

        if (directPageMatches.length) {
          pushSuggestion(directRes, Object.assign({}, p))
        } else if (synonymPageMatches.length) {
          pushSuggestion(synonymRes, Object.assign({}, p))
        }

        if (p.headers) {
          for (let j = 0; j < p.headers.length; j++) {
            const h = p.headers[j]
            if (!h.title) {
              continue
            }

            const directHeaderMatches = getMatches(p, h.title, [])
            const synonymHeaderMatches = getMatches(p, h.title, this.$site.themeConfig.searchSynonyms)

            if (directHeaderMatches.length || synonymHeaderMatches.length) {
              const suggestion = Object.assign({}, p, {
                path: p.path + '#' + h.slug,
                header: h
              })

              if (directHeaderMatches.length) {
                pushSuggestion(directRes, suggestion)
              } else {
                pushSuggestion(synonymRes, suggestion)
              }
            }
          }
        }
      }

      return directRes.concat(synonymRes)
    },

    // make suggestions align right when there are not enough items
    alignRight () {
      const navCount = (this.$site.themeConfig.nav || []).length
      const repo = this.$site.repo ? 1 : 0
      return navCount + repo <= 2
    }
  },

  methods: {
    getPageLocalePath (page) {
      for (const localePath in this.$site.locales || {}) {
        if (localePath !== '/' && page.path.indexOf(localePath) === 0) {
          return localePath
        }
      }
      return '/'
    },

    isSearchable (page) {
      let searchPaths = SEARCH_PATHS

      if (searchPaths === null) { return true }

      searchPaths = Array.isArray(searchPaths) ? searchPaths : new Array(searchPaths)

      return searchPaths.filter(path => {
        return page.path.match(path)
      }).length > 0
    },

    onUp () {
      if (this.showSuggestions) {
        if (this.focusIndex > 0) {
          this.focusIndex--
        } else {
          this.focusIndex = this.suggestions.length - 1
        }
      }
    },

    onDown () {
      if (this.showSuggestions) {
        if (this.focusIndex < this.suggestions.length - 1) {
          this.focusIndex++
        } else {
          this.focusIndex = 0
        }
      }
    },

    go (i) {
      if (!this.showSuggestions) {
        return
      }

      this.$router.push(this.suggestions[i].path)
      this.query = ''
      this.focusIndex = 0
    },

    focus (i) {
      this.focusIndex = i
    },

    unfocus () {
      this.focusIndex = -1
    }
  }
}
</script>

<style lang="stylus">
.search-box
  display inline-block
  position relative
  margin-right 1rem
  input
    cursor text
    width 10rem
    height: 2rem
    color lighten($textColor, 25%)
    display inline-block
    border 1px solid darken($borderColor, 10%)
    border-radius 2rem
    font-size 0.9rem
    line-height 2rem
    padding 0 0.5rem 0 2rem
    outline none
    transition all .2s ease
    background #fff url('~@vuepress/plugin-search/search.svg') 0.6rem 0.5rem no-repeat
    background-size 1rem
    &:focus
      cursor auto
      border-color $accentColor
  .suggestions
    background #fff
    width 20rem
    position absolute
    top 1.5rem
    z-index 10
    max-height calc(100vh - 8rem)
    overflow-y auto
    overflow-x hidden
    overscroll-behavior contain
    border 1px solid darken($borderColor, 10%)
    border-radius 6px
    padding 0.4rem
    list-style-type none
    &.align-right
      right 0
  .suggestion
    line-height 1.4
    padding 0.4rem 0.6rem
    border-radius 4px
    cursor pointer
    a
      white-space normal
      color lighten($textColor, 35%)
      .page-title
        font-weight 600
      .header
        font-size 0.9em
        margin-left 0.25em
      .synonyms
        display block
        margin-top 0.25rem
        font-size 0.8em
        color $gray-dk
    &.focused
      background-color #f3f4f5
      a
        color $accentColor

@media (max-width: $MQNarrow)
  .search-box
    input
      cursor pointer
      width 0
      border-color transparent
      position relative
      &:focus
        cursor text
        left 0
        width 10rem

// Match IE11
@media all and (-ms-high-contrast: none)
  .search-box input
    height 2rem

@media (max-width: $MQNarrow) and (min-width: $MQMobile)
  .search-box
    .suggestions
      left 0

@media (max-width: $MQMobile)
  .search-box
    margin-right 0
    input
      left 1rem
    .suggestions
      right 0
</style>