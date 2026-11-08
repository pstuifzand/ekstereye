<template>
    <div class="short-timeline">
        <div class="box small-item" style="margin-bottom: 4px" v-for="item in timeline.items" :key="item._id">
            <div class="name" v-text="text(item)"></div>
            <div class="time" v-text="niceTime(item)"></div>
            <div v-text="author_name(item)"></div>
        </div>
    </div>
</template>

<script>
    import { fromNow } from "@/relative-time";

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
                return fromNow(item.published)
            }
        }
    }
</script>

<style scoped>
    .short-timeline {
        margin-top: 20px;
        position: fixed;
        max-width: 280px;
    }
    .small-item {
        font-size: 12px;
    }
    .box {
        padding: 6px;
    }
</style>