import { Router } from 'express';
import { globalStore } from '../../store.js';

export function createTasksRouter() {
  const router = Router();

  router.get('/_tasks', (req, res) => {
    res.json(globalStore.listTasks());
  });

  router.get('/_tasks/:task_id', (req, res) => {
    const { task_id } = req.params;
    const task = globalStore.getTask(task_id);
    if (!task) {
      return res.status(404).json({
        error: {
          root_cause: [
            { type: 'resource_not_found_exception', reason: `task [${task_id}] not found` },
          ],
          type: 'resource_not_found_exception',
          reason: `task [${task_id}] not found`,
        },
        status: 404,
      });
    }
    res.json(task);
  });

  router.post('/_tasks/:task_id/_cancel', (req, res) => {
    const { task_id } = req.params;
    res.json(globalStore.cancelTask(task_id));
  });

  router.post('/_tasks/_cancel', (req, res) => {
    const { actions, nodes } = req.query;
    // If unknown action or specific nodes that don't match our mock node, return empty
    if (actions === 'unknown_action' || (nodes && nodes !== 'mock-node')) {
      return res.json({ nodes: {} });
    }

    const allTasks = globalStore.listTasks();
    const mockNode = allTasks.nodes['mock-node'];
    if (mockNode) {
      for (const taskId of Object.keys(mockNode.tasks)) {
        globalStore.cancelTask(taskId);
      }
    }
    res.json(allTasks);
  });

  return router;
}
