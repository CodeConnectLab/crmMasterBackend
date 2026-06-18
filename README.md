#### Set UP

    node version - ^16 
    mongodb 4.2

#### ENV

    .env location
        - server/config/.env

    .env format mentioned in server/config/.env-sample

#### To run server

    use command
        - node server/app.js

    server port - 
        1. port mentioned in ENV
        2. default 7000

#### Duplicacy Check and delete
cd crmMasterBackend
where --company is the company id for which you want to check the duplicacy
# 1) Count first (safe, no deletes)
node server/migrations/dedupe-leads-by-contact.js --company=69d4786b6a13471034370e79

# 2) Then actually delete the duplicates
node server/migrations/dedupe-leads-by-contact.js --company=69d4786b6a13471034370e79 --delete