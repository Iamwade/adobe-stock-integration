<?php
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
declare(strict_types=1);

namespace Magento\AdobeIms\Controller\Adminhtml\User;

use Magento\AdobeImsApi\Api\LogOutInterface;
use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\Controller\Result\Json;
use Magento\Framework\Controller\ResultFactory;
use Magento\Framework\HTTP\Client\CurlFactory;

/**
 * Logout from adobe account
 */
class Logout extends Action
{
    private const HTTP_INTERNAL_SUCCESS = 200;
    private const HTTP_INTERNAL_ERROR = 500;

    /**
     * @see _isAllowed()
     */
    public const ADMIN_RESOURCE = 'Magento_AdobeIms::logout';

    /**
     * @var LogOutInterface
     */
    private $logout;

    /**
     * @param Context $context
     * @param LogOutInterface $logOut
     */
    public function __construct(
        Context $context,
        LogOutInterface $logOut
    ) {
        parent::__construct($context);
        $this->logout = $logOut;
    }

    /**
     * @inheritdoc
     */
    public function execute()
    {
        $logout = $this->logout->execute();
        if ($logout) {
            $responseCode = self::HTTP_INTERNAL_SUCCESS;
            $response = [
                'success' => true,
            ];
        } else {
            $responseCode = self::HTTP_INTERNAL_ERROR;
            $response = [
                'success' => false,
            ];
        }
        /** @var Json $resultJson */
        $resultJson = $this->resultFactory->create(ResultFactory::TYPE_JSON);
        $resultJson->setHttpResponseCode($responseCode);
        $resultJson->setData($response);

        return $resultJson;
    }
}
