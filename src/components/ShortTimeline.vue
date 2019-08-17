<template>
    <div style="margin-top: 20px">
        <div class="box small-item" style="margin-bottom: 4px" v-for="(item, i) in timeline.items" :key="i">
            <div class="name" v-text="text(item)"></div>
            <div class="time" v-text="niceTime(item)"></div>
            <div v-text="author_name(item)"></div>
        </div>
    </div>
</template>

<script>
    import moment from "moment";

    export default {
        name: "ShortTimeline",

        props: ['timeline'],

        methods: {
            text (item) {
                if (item.name) return item.name
                if (item.content && item.content.text) return item.content.text
                return item.content
            },
            author_name(item) {
                if (item.author) {
                    return item.author.name
                }
                return '';
            },
            niceTime(item) {
                return moment(item.published).fromNow()
            }
        }
    }
</script>

<style scoped>
    .small-item {
        font-size: 10px;
    }
    .box {
        padding: 6px;
    }
</style>