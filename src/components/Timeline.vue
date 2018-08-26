<template>
  <div :class="this.className">
    <div class="timeline--item" v-for="item in items" :key="item.id">
      <TimelineEntry :item="item"/>
    </div>

    <div class="level">
      <div class="level-item">
        <button class="button" @click="prevPage" v-if="timeline.paging.before">Prev Page</button>
      </div>
      <div class="level-item">
        <button class="button" @click="nextPage" v-if="timeline.paging.after">Next Page</button>
      </div>
    </div>
  </div>
</template>

<script>
  import TimelineEntry from '@/components/Entry'

  export default {
    name: "Timeline",
    props: ['className', 'channel', 'timeline'],
    components: {TimelineEntry},

    computed: {
      items () {
        return this.timeline.items.filter((item) => {
          return item.type === 'entry';
        })
      }
    },

    methods: {
      nextPage() {
        this.$emit('getPage', {uid: this.channel.uid, after: this.timeline.paging.after})
      },
      prevPage() {
        this.$emit('getPage', {uid: this.channel.uid, before: this.timeline.paging.before})
      }
    }
  }
</script>

<style scoped>
  .timeline--item {
    margin-bottom: 16px;
  }
</style>