Smalltalk can be found in backend/scripts, which contains both hazard_statistics.st and run_analysis.st.
These files run on the server and act as a statistical analysis API.
They recieve a JSON input from the frontend, format it for statistical processing, then run an analysis for total potholes, most common severity, average resolved reports, most resolved reports, severity counts, bounding box, and top 5 by resolved reports.
This data is formatted back into JSON and sent back over to the frontend to be displayed on the map page.
