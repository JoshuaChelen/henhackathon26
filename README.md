Authors: Benjamin Wootten, Magnus Culley, Andrew Orlov, Joshua Chelen

Deployed site: https://tumbletracker.tech/

Smalltalk can be found in backend/scripts, which contains both hazard_statistics.st and run_analysis.st.
These files run on the server and act as a statistical analysis API.
They recieve a JSON input from the frontend, format it for statistical processing, then run an analysis for total potholes, most common severity, average resolved reports, most resolved reports, severity counts, bounding box, and top 5 by resolved reports.
This data is formatted back into JSON and sent back over to the frontend to be displayed on the map page.



## Inspiration

Our main inspiration came from the theme of the hackathon. During the opening ceremony, we were told that the mayor had been captured, and we, as hackers, had to travel to various areas to find out where he was. We started asking ourselves: what kinds of dangers would hackers face along this perilous journey? How could we keep others safe and provide warnings?

This led us to create **Tumble Tracker**, an AI-driven road hazard reporting tool.


## What it does
Tumble Tracker is powered by an **image segmentation AI model&& that detects road hazards such as potholes. Using this data, users can either share their location or manually enter it on a crowd-sourced map to help build a large dataset of road hazards. Each report includes the severity level and exact location of the hazard.

When enough users confirm that a hazard is no longer present, it is marked as resolved. Additionally, users can automatically generate reports using LLMs to send to local offices regarding the detected hazard.

To formalize severity scoring, we can define a hazard score:


## How we built it
Each team member had a primary focus. Magnus designed most of the front-end UI, Ben and Andrew handled the front-end/back-end integration, and Josh worked on the computer vision tasks. While this is a slight oversimplification - since everyone contributed across multiple areas - these general roles helped us stay focused and work in parallel without major conflicts.


## Challenges we ran into
Although our team has experience with full-stack development, many of the tools we used were new to us. DigitalOcean and Smalltalk were unfamiliar, and most of our team had not previously worked with Supabase. Hosting the smalltalk server on DigitalOcean was one of the most difficult tasks of this hackathon. Learning these technologies under time constraints was a significant challenge. 


## Accomplishments that we're proud of
We are especially proud of the breadth and completeness of our implementation. This was our first time creating a fully deployed full-stack application within such a short timeframe.

In just 24 hours, we:
-Implemented a computer vision hazard detection model
-Designed a dynamic and creative UI
-Displayed hazards on a publicly accessible map
-Implemented a functioning backend and database for the site
-Generated AI-powered PDF summaries to send to government offices


## What we learned
Hackathons are an incredible way to rapidly develop ideas and explore new tools. We intentionally selected technologies outside our comfort zones to challenge ourselves. We especially enjoyed working with DigitalOcean, and learning Smalltalk was both unique and rewarding.


## What's next for Tumble Tracker
Short term:
-Improve model accuracy
-Strengthen data privacy protections
-Expand hazard tracking coverage

Long term:
-Develop a faster, more efficient model
-Integrate live dashcam feeds
-Build a global network of hazard reporting

## Tech Stack
Tumble Tracker utilizes
DigitalOcean, Supabase, Tanstack Start, Google Gemini, Opencv, Typescript, Python, Smalltalk

