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
    /* Fixed positioning pulled this column out of the layout and laid it over the
       timeline on anything narrower than three columns. Sticky keeps it beside the feed
       as long as there is room, and it drops into the flow when there is not. */
    .short-timeline {
        margin-top: 20px;
        position: sticky;
        top: 70px;
        max-width: 280px;
    }

    @media (max-width: 1024px) {
        .short-timeline {
            position: static;
            max-width: none;
            margin-top: 12px;
        }
    }
    .small-item {
        font-size: 12px;
    }
    .box {
        padding: 6px;
    }
</style>