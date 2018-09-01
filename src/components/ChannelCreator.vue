<template>
  <div :class="modalClasses">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Create Channel</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>
      <section class="modal-card-body">
        <div class="field">
          <label for="name" class="label">Name</label>
          <div class="control"><input type="text" v-model="name" id="name" class="input"/></div>
        </div>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success" @click="create">Add channel</button>
        <button class="button" @click="close">Cancel</button>
      </footer>
    </div>
  </div>
</template>

<script>
  export default {
    name: "ChannelCreator",
    props:['isOpen'],

    data() {
      return {
        'name': ''
      }
    },


    computed: {
      modalClasses() {
        return {'modal': true, 'is-active': this.isOpen}
      }
    },

    methods: {
      close() {
        this.$store.dispatch('closeChannelCreator')
        this.name = ''
      },
      create() {
        this.$store.dispatch('createChannel', this.name)
          .then(() => {
            this.close()
          })
      }
    }

  }
</script>

<style scoped>

</style>