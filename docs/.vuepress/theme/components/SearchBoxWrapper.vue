<template>
  <SearchBox v-if="!hasVersions"/>
  <VersionedSearchBox v-else/>
</template>

<script>
import SearchBox from '@SearchBox'

export default {
  components: {
    SearchBox,
    VersionedSearchBox: () => import('./VersionedSearchBox.vue')
  },
  computed: {
    hasVersions () {
      return this.$versions && this.$versions.length > 0
    }
  }
}
</script>
