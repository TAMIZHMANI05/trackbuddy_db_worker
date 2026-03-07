import logger from './utils/logger';

(() => {
    try {
        logger.info(`APPLICATION_STARTED`, {});
    } catch (err) {
        logger.error(`APPLICATION_ERROR`, { meta: err });
    }
})();
