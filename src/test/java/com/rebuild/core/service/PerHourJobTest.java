/*!
Copyright (c) REBUILD <https://getrebuild.com/> and/or its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/

package com.rebuild.core.service;

import com.rebuild.TestSupport;
import org.junit.jupiter.api.Test;

/**
 * @author devezhao
 * @since 2020/11/11
 */
class PerHourJobTest extends TestSupport {

    @Test
    void doCleanTempFiles() {
        new PerHourJob().doCleanTempFiles();
    }

    @Test
    void doCleanExpiredShare() {
        new PerHourJob().doCleanExpiredShare();
    }
}