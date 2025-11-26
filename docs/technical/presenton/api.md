###Upload Files
Upload files to be used later.

curl --request POST \
  --url https://api.presenton.ai/api/v1/ppt/files/upload \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: multipart/form-data'

###Get Uploaded Images
Get all uploaded images.

curl --request GET \
  --url https://api.presenton.ai/api/v1/ppt/images/uploaded \
  --header 'Authorization: <authorization>'

  
###Upload Image
Upload an image.
curl --request POST \
  --url https://api.presenton.ai/api/v1/ppt/images/upload \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: multipart/form-data' \
  --form file=@example-file

###Delete Uploaded Image By Id
Delete an uploaded image by id.
curl --request DELETE \
  --url https://api.presenton.ai/api/v1/ppt/images/{id} \
  --header 'Authorization: <authorization>'

###Get All Templates
curl --request GET \
  --url https://api.presenton.ai/api/v1/ppt/template/all \
  --header 'Authorization: <authorization>'

###Get Template By Id
curl --request GET \
  --url https://api.presenton.ai/api/v1/ppt/template/{id} \
  --header 'Authorization: <authorization>'

###Get Template Example
Get a example slides content data for a template. This data can be used to create presentation from json.
curl --request GET \
  --url https://api.presenton.ai/api/v1/ppt/template/{id}/example \
  --header 'Authorization: <authorization>'

###Get All User Presentations
Get all presentations of the user.
curl --request GET \
  --url https://api.presenton.ai/api/v1/ppt/presentation/all \
  --header 'Authorization: <authorization>'

###Get Presentation And Slides By Id
Get a presentation and its slides by id.
curl --request GET \
  --url https://api.presenton.ai/api/v1/ppt/presentation/{id} \
  --header 'Authorization: <authorization>'

###Delete Presentation By Id
Delete a presentation by id.
curl --request DELETE \
  --url https://api.presenton.ai/api/v1/ppt/presentation/{id} \
  --header 'Authorization: <authorization>'

###Generate Presentation Sync
Generate a presentation synchronously.
curl --request POST \
  --url https://api.presenton.ai/api/v1/ppt/presentation/generate \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: application/json' \
  --data '{
  "content": "<string>",
  "slides_markdown": [
    "<string>"
  ],
  "instructions": "<string>",
  "tone": "default",
  "verbosity": "standard",
  "markdown_emphasis": true,
  "web_search": false,
  "image_type": "stock",
  "theme": "<string>",
  "n_slides": 8,
  "language": "English",
  "template": "general",
  "include_table_of_contents": false,
  "include_title_slide": true,
  "allow_access_to_user_info": true,
  "files": [
    "<string>"
  ],
  "export_as": "pptx",
  "trigger_webhook": false
}'

###Generate Presentation Async
Generate a presentation asynchronously.

Use /api/v1/ppt/presentation/status/task-xxxxxxxxxx to get the status of presentation.

curl --request POST \
  --url https://api.presenton.ai/api/v1/ppt/presentation/generate/async \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: application/json' \
  --data '{
  "content": "<string>",
  "slides_markdown": [
    "<string>"
  ],
  "instructions": "<string>",
  "tone": "default",
  "verbosity": "standard",
  "markdown_emphasis": true,
  "web_search": false,
  "image_type": "stock",
  "theme": "<string>",
  "n_slides": 8,
  "language": "English",
  "template": "general",
  "include_table_of_contents": false,
  "include_title_slide": true,
  "allow_access_to_user_info": true,
  "files": [
    "<string>"
  ],
  "export_as": "pptx",
  "trigger_webhook": false
}'

###Check Async Presentation Generation Status
Check the status of a presentation being generated asynchronously. Use /api/v1/ppt/presentation/status/task-xxxxxxxxxx to get the status of presentation.

curl --request GET \
  --url https://api.presenton.ai/api/v1/ppt/presentation/status/{id} \
  --header 'Authorization: <authorization>'

###Create Presentation From Json Sync
Create a presentation from JSON synchronously.
curl --request POST \
  --url https://api.presenton.ai/api/v1/ppt/presentation/create/from-json \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: application/json' \
  --data '{
  "language": "English",
  "title": "<string>",
  "template": "general",
  "theme": "<string>",
  "slides": [],
  "export_as": "pptx",
  "trigger_webhook": false
}'

###Create Presentation From Json Async
Create a presentation from JSON asynchronously.

Use /api/v1/ppt/presentation/status/task-xxxxxxxxxx to get the status of presentation.
curl --request POST \
  --url https://api.presenton.ai/api/v1/ppt/presentation/create/from-json/async \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: application/json' \
  --data '{
  "language": "English",
  "title": "<string>",
  "template": "general",
  "theme": "<string>",
  "slides": [],
  "export_as": "pptx",
  "trigger_webhook": false
}'

###Edit Presentation With New Content
Edit presentation with new content.

curl --request POST \
  --url https://api.presenton.ai/api/v1/ppt/presentation/edit \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: application/json' \
  --data '{
  "presentation_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
  "slides": [
    {
      "index": 123,
      "content": {}
    }
  ]
}'

###Derive Presentation From Existing One
Derive a new presentation from your existing presentation.
curl --request POST \
  --url https://api.presenton.ai/api/v1/ppt/presentation/derive \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: application/json' \
  --data '{
  "presentation_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
  "slides": [
    {
      "index": 123,
      "content": {}
    }
  ]
}'

###Export Presentation As Pptx Or Pdf
Export presentation as PPTX or PDF using API.
curl --request POST \
  --url https://api.presenton.ai/api/v1/ppt/presentation/export \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: application/json' \
  --data '{
  "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a"
}'
