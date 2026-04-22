# **Installation and how to use**

## Frontend

1. Navigate to frontend directory

  
   ```cd task-planning```
2. Install dependancies
   
   ```npm i```
3. Run the server
   
   ```npm run dev```

## Backend

1. Navigate to the backend folder

  ```cd backend```

2. ### Running the model routing and inference backend

   1. In the `.env.sample` file in the project root input the following values and save as `.env`:
      - `GEMINI_API_KEY=`
      - `CHUTES_API_TOKEN=`

   2. Create virtual environment for flask backend

      ```python -m venv venv_flask```
   3. Activate the venv
  
      ```venv_flask/Scripts/Activate.ps1```

   4. Install requirements
  
      ```pip install -r requirements.txt```

   5. Run the server
  
      ```python deep.py```

3. Running the persistent data backend (in a separate terminal)

   1. Navigate to the django backend folder
  
      ```cd taskPlanning```

   2. Create virtual environment for Django backend
  
      ```python -m venv venv_django```

   3. Activate the venv
  
      ```venv_django/Scripts/Activate.ps1```

   5. Navigate to the Django project folder
  
      ```cd taskPlanning```

   6. Install requirements
  
      ```pip install -r requirements.txt```

   7. Enter the values in `.env.sample` and save it as `.env`
  
   8. Navigate out to the backend root and run the migrations and the server
  
      ```
      cd ..
      python manage.py makemigrations
      python manage.py migrate
      python manage.py runserver
      ```

      
