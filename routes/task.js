const express = require('express');
const router = express.Router();
const db = require('../db');
const Handlebars = require('handlebars');
const paginate = require('handlebars-paginate');

// Регистрация хелпера handlebars-paginate
Handlebars.registerHelper('paginate', paginate);

// Список задач
router.get('/tasks', async (req, res) => {
    try {
        const user = req.user;
        const getCategoriesSql = 'SELECT * FROM categories';
        const getPrioritiesSql = 'SELECT * FROM priorities';

        // Параметры пагинации
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4; // Установите желаемый лимит
        const offset = (page - 1) * limit;

        let getTasksSql = 'SELECT * FROM tasks WHERE user_id = ?';
        const queryParams = [user.id];

        if (req.query.category_id) {
            getTasksSql += ' AND category_id = ?';
            queryParams.push(parseInt(req.query.category_id)); // Преобразуйте значение в число
        }

        if (req.query.priority_id) {
            getTasksSql += ' AND priority_id = ?';
            queryParams.push(parseInt(req.query.priority_id)); // Преобразуйте значение в число
        }

        if (req.query.search) {
            getTasksSql += ' AND title LIKE ?';
            queryParams.push(`%${req.query.search}%`);
        }

        getTasksSql += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        db.query(getCategoriesSql, (errCategories, categories) => {
            if (errCategories) {
                console.error('Error fetching categories:', errCategories);
                res.status(500).send('Internal Server Error');
                return;
            }

            db.query(getPrioritiesSql, (errPriorities, priorities) => {
                if (errPriorities) {
                    console.error('Error fetching priorities:', errPriorities);
                    res.status(500).send('Internal Server Error');
                    return;
                }

                db.query(getTasksSql, queryParams, (errTasks, tasks) => {
                    if (errTasks) {
                        console.error('Error fetching tasks:', errTasks);
                        res.status(500).send('Internal Server Error');
                        return;
                    }

                    // Объединяем задачи с категориями и приоритетами по id
                    const tasksWithDetails = tasks.map(task => {
                        const category = categories.find(cat => cat.id === task.category_id);
                        const priority = priorities.find(prio => prio.id === task.priority_id);

                        return {
                            ...task,
                            category: category ? category.name : null,
                            priority: priority ? priority.name : null,
                        };
                    });

                    // Создаем объект пагинации
                    const pagination = {
                        page,
                        limit,
                        totalCount: tasks.length,
                    };

                    // Отправляем представление с полученными данными, включая категории и приоритеты
                    res.render('tasks', {
                        tasks: tasksWithDetails,
                        user: req.session.user,
                        categories: categories, // Передаем категории в представление
                        priorities: priorities, // Передаем приоритеты в представление
                        pagination: pagination, // Передаем объект пагинации в представление
                        title: 'Tasks'
                    });
                });
            });
        });
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Форма создания задачи
router.get('/tasks/create', (req, res) => {
    try {
        db.query('SELECT * FROM categories', (categoryError, categoryResults) => {
            if (categoryError) {
                console.error(categoryError);
                // Обработка ошибки запроса категорий
                return res.status(500).send('Internal Server Error');
            }

            db.query('SELECT * FROM priorities', (priorityError, priorityResults) => {
                if (priorityError) {
                    console.error(priorityError);
                    // Обработка ошибки запроса приоритетов
                    return res.status(500).send('Internal Server Error');
                }

                res.render('create', {
                    user: req.session.user,
                    categories: categoryResults,
                    priorities: priorityResults,
                    title: 'Create Task'
                });
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Маршрут для обработки POST-запроса на добавление задачи
router.post('/tasks/create', (req, res) => {
    const title = req.body.title;
    const user_id = req.session.user.id;
    const category_id = req.body.category_id;
    const priority_id = req.body.priority_id;


    const query = 'INSERT INTO tasks (title, user_id, category_id, priority_id) VALUES (?, ?, ?, ?)';

    db.query(query, [title, user_id, category_id, priority_id], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        req.flash('success', 'Задача создана успешно!');
        res.redirect('/tasks');
    });
});

// Маршрут для редактирования задачи
router.get('/tasks/edit/:taskId', (req, res) => {
    const taskId = req.params.taskId;

    const query = 'SELECT * FROM tasks WHERE id = ?';

    db.query(query, [taskId], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const task = result[0];

        db.query('SELECT * FROM categories', (categoryError, categoryResults) => {
            if (categoryError) {
                console.error(categoryError);
                return res.status(500).send('Internal Server Error');
            }

            db.query('SELECT * FROM priorities', (priorityError, priorityResults) => {
                if (priorityError) {
                    console.error(priorityError);
                    return res.status(500).send('Internal Server Error');
                }
               res.render('edit', { task, user: req.session.user, categories: categoryResults, priorities: priorityResults, title: 'Edit Task' });
            });
        });
    });
});

// Маршрут для обработки POST-запроса для редактирования задачи

router.post('/tasks/edit/:taskId', (req, res) => {
    const taskId = req.params.taskId;
    const newTitle = req.body.title;
    const newCategory = req.body.category_id;
    const newPriority = req.body.priority_id;

    const query = 'UPDATE tasks SET title = ?, category_id = ?, priority_id =? WHERE id = ?';

    db.query(query, [newTitle, newCategory, newPriority, taskId], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        req.flash('success', 'Задача обновлена успешно!');
        res.redirect('/tasks');
    });
});

// Маршрут для изменения статуса задачи
router.post('/tasks/:id/complete', (req, res) => {
    const taskId = req.params.id;

    const query = 'SELECT * FROM tasks WHERE id = ?';

    db.query(query, [taskId], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (result.length === 0) {
            console.error('Задача не найдена');
            res.status(404).send('Not Found');
            return;
        }

        const task = result[0];

        // Обновляем значение completed в противоположное
        const updatedCompleted = !task.completed;

        // Обновляем значение completed в базе данных
        const updateQuery = 'UPDATE tasks SET completed = ? WHERE id = ?';

        db.query(updateQuery, [updatedCompleted, taskId], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Ошибка при обновлении задачи:', updateErr);
                res.status(500).send('Internal Server Error');
                return;
            }
            req.flash('success', 'Задача обновлена успешно!');
            console.log('Задача обновлена');
            res.redirect('/tasks');
        });
    });
});

router.post('/tasks/:id/delete', (req, res) => {
    const taskId = req.params.id;
    const user = req.session.user;

    const query = 'DELETE FROM tasks WHERE id = ? AND user_id = ?';

    db.query(query, [taskId, user.id], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        req.flash('success', 'Задача удалена успешно!');
        res.redirect('/tasks');
    });
});

module.exports = router;