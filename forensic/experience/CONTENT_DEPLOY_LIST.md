# CONTENT_DEPLOY_LIST.md — First Content Drop

## How to Publish (via Django Admin at /admin/)

### ARTICLE 1 — Publish Immediately
**Title:** When the Fire Falls Before You Feel Ready  
**Category:** Revival / Faith  
**Body:**
```
There is a recurring pattern in Scripture that should terrify and comfort us simultaneously: God moves before the person feels qualified.

Moses had a speech impediment. Gideon was threshing wheat in a winepress — hiding. Jeremiah said he was too young. Elijah ran from Jezebel the morning after calling fire from heaven.

The fire falls on the unready.

This is not motivational language. This is a consistent pattern in the story of God. If you are waiting to feel ready before you step into what God has called you to — you are using a criteria He never established.

**What actually qualifies you?**

Not confidence. Not training. Not the right season. According to Acts 1:8, the only qualification for bearing witness is the power of the Holy Spirit. And the Spirit doesn't ask if you're ready. He asks if you're willing.

The believers in the upper room were terrified. The city outside had killed their teacher. They had no platform, no plan, no strategy. They had a promise and an instruction: wait, then go.

Three thousand people joined in a single day.

**The question is not: Are you ready?**  
**The question is: Are you willing to be present when He moves?**

Africa is standing in a moment like the upper room. The fire is already burning — in living rooms, in early morning prayer meetings, in the hearts of young people who cannot explain why they weep when they worship.

You don't have to start something great. You have to show up faithfully to what He has already started.

Don't wait for the feeling. Show up for the fire.
```
**Tags:** Revival, Holy Spirit, Calling, Africa  
**Status:** PUBLISH NOW

---

### ARTICLE 2 — Publish Immediately
**Title:** Africa Is Not Waiting for the West to Send Revival  
**Category:** Revival / African Christianity  
**Body:**
```
For most of church history, African believers were told that revival comes from somewhere else. The great awakenings happened in Europe. The missionaries came from America. The theology was imported.

That era is over.

The fastest-growing Christian movements on earth are in Africa. Nigeria, Kenya, Ghana, Ethiopia, Uganda — these are not mission fields. They are sending nations. African apostles, prophets, and evangelists are planting churches across Europe, Asia, and the Americas.

What the Spirit is doing in Africa is not a local phenomenon. It is a global repositioning.

**But there is a danger in this moment.**

Growth without depth produces crowds without foundations. We can fill stadiums and still have a generation that doesn't know how to pray alone in a room. We can broadcast healing miracles and still have communities where no one sits with the grieving.

Spirit Revival Africa exists for a specific reason: to build the interior life of the African believer. Not just the platform. Not just the ministry. The person.

Because revival that lasts is not a campaign. It is a culture. And cultures are built one person at a time — in secret, in prayer, in the daily obedience that no one celebrates.

**Africa doesn't need the next big conference.**  
**Africa needs men and women who burn when the cameras are off.**

That is what we are building here.
```
**Tags:** Africa, Revival, Church, Mission  
**Status:** PUBLISH NOW

---

### TESTIMONY 1 — Publish as Story
**Title:** I prayed for my brother for 11 years. He called me last Thursday.  
**Author:** Aisha N. (Lagos, Nigeria)  
**Body:**
```
My brother left the church at 22 and spent the next decade in a life I won't describe here. I prayed for him every morning. Not every morning when I felt faith. Every morning — including the mornings I was praying out of discipline alone, with no feeling behind it.

Eleven years.

Last Thursday my phone rang at 6am. It was him. He said: "I don't know how to say this but something happened to me last night and I need you to explain it."

I already knew. I had been praying that specific prayer — that he would have an encounter he couldn't explain to anyone but me — for three years.

We talked for two hours. He is coming home for Easter.

I am not sharing this to make it sound easy. Eleven years is not easy. There were months I wondered if I was praying into silence. But I kept returning to one verse: "The effective, fervent prayer of a righteous person accomplishes much."

Much. Not immediately. Not without cost. But much.

Don't stop.
```
**Status:** PUBLISH NOW as Story (is_public: true)

---

### DISCIPLESHIP PREVIEW — Add to Discipleship Page
**Course Title:** Foundations of Fire — A 4-Week Journey into Sustained Revival  
**Lesson 1 Preview (unlocked):**

**"Why Revival Dies: The Interior Problem"**

Most revival movements follow the same arc: explosion of power → rapid growth → gradual cooling → return to normalcy. Historians call it the "revival cycle." Theologians debate its causes.

The answer, at its core, is almost always the same: the interior work did not keep pace with the exterior work.

In this course, we examine four foundations that sustain revival beyond the initial fire — in individuals, in communities, and across generations. We begin where every lasting movement begins: the interior life of the believer.

Lesson objectives:
- Understand why outward ministry without inward formation collapses
- Identify the three warning signs of a cooling interior life
- Establish one concrete daily practice before Lesson 2

**How to add:** Go to Django admin → Discipleship → Courses → Add Course. Then add Lesson 1 as a text lesson with the content above.

---

## QUICK-ADD CHECKLIST

- [ ] Log in to admin panel at `/admin/`
- [ ] Go to Content → Articles → Add Article → paste Article 1 → Publish
- [ ] Go to Content → Articles → Add Article → paste Article 2 → Publish  
- [ ] Go to Content → Stories → Add Story → paste Testimony 1 → is_public=True → Publish
- [ ] Go to Discipleship → Courses → Add Course → Add Lesson 1 (preview/free)
- [ ] Run: `cd backend && python manage.py seed_prayer_wall`
